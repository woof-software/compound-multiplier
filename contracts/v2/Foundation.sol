// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import { IWEth } from "../external/weth/IWEth.sol";

import { ISwapPlugin } from "./interfaces/ISwapPlugin.sol";
import { IFlashLoanPlugin } from "./interfaces/IFlashLoanPlugin.sol";
import { ICorePlugin } from "./interfaces/ICorePlugin.sol";

import { IExchange } from "./interfaces/IExchange.sol";
import { IMultiplier } from "./interfaces/IMultiplier.sol";
import { ICover } from "./interfaces/ICover.sol";

import { IStructs as IS } from "./interfaces/IStructs.sol";
import { IAlerts as IA } from "./interfaces/IAlerts.sol";
import { IEvents as IE } from "./interfaces/IEvents.sol";
import { IFoundation } from "./interfaces/IFoundation.sol";

/**
 * @title Foundation
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice This contract serves as a foundational component for managing plugins that facilitate flash loans and token swaps.
 * It maintains a registry of supported plugins, each identified by a unique key derived from the plugin's address and callback selector.
 * The contract provides internal functions to validate and interact with these plugins, ensuring secure and modular integration with various DeFi protocols.
 * @dev V2 Foundation uses ICorePlugin abstraction to support multiple lending protocols (Compound, Morpho, Aave, etc.)
 */
// aderyn-fp-next-line(locked-ether)
contract Foundation is IFoundation, IExchange, IMultiplier, ICover, ReentrancyGuard {
    using SafeERC20 for IERC20;
    /// @dev The scale for factors
    uint64 public constant FACTOR_SCALE = 1e18;
    uint16 public constant PRECISION = 1e4;

    /// @notice Magic byte to identify valid plugin calls
    bytes1 constant PLUGIN_MAGIC = 0x01;

    /// @notice Offset constants for transient storage slots
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant SNAPSHOT_OFFSET = 0x20;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant LOAN_PLUGIN_OFFSET = 0x40;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant SWAP_PLUGIN_OFFSET = 0x60;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant CORE_PLUGIN_OFFSET = 0x80;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant ASSET_OFFSET = 0xA0;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant AMOUNT_OFFSET = 0xC0;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant USER_OFFSET = 0xE0;
    // aderyn-fp-next-line(unused-state-variable)
    uint16 internal constant CORE_OFFSET = 0x100;

    /// @notice Storage slot for transient data, derived from contract name hash
    bytes32 internal constant SLOT_FOUNDATION = bytes32(uint256(keccak256("Foundation.storage")) - 1);

    /// @notice Storage slot for core config in transient storage
    bytes32 internal constant SLOT_CORE = bytes32(uint256(keccak256("Foundation.core")) - 1);

    /**
     * @inheritdoc IFoundation
     */
    address public immutable wEth;

    /**
     * @inheritdoc IFoundation
     */
    address public immutable treasury;

    /// @notice Mapping of function selectors to their corresponding plugin configurations
    /// @dev Key is the callback selector, value contains plugin endpoint and configuration
    mapping(bytes32 => bytes) public plugins;

    /**
     * @notice Allows the contract to receive ETH
     * @dev Required for receiving ETH from WETH unwrapping or native ETH operations
     */
    receive() external payable {}

    /**
     * @notice Fallback function to handle plugin calls via delegatecall
     * @dev This function processes calls to flash loan and swap plugins, managing the entire lifecycle of a flash loan operation.
     * It retrieves transient data from storage, validates the call, and orchestrates the flash loan process including swaps and collateral management.
     */
    fallback() external payable {
        (
            uint256 snapshot,
            address loanPlugin,
            address swapPlugin,
            address corePlugin,
            IERC20 collateral,
            uint256 amount,
            address user,
            IS.Mode mode,
            bytes memory coreConfig
        ) = _tload();

        require(corePlugin != address(0), IA.InvalidCorePlugin());

        IS.CallbackData memory data = _callback(loanPlugin, msg.data);
        require(data.asset.balanceOf(address(this)) >= snapshot + data.debt, IA.InvalidAmountOut());

        IS.ProcessParams memory params = mode == IS.Mode.MULTIPLY
            ? IS.ProcessParams({
                supplyAsset: collateral,
                supplyAmount: amount,
                withdrawAsset: data.asset,
                withdrawAmount: data.debt + data.fee
            })
            : IS.ProcessParams({
                supplyAsset: data.asset,
                supplyAmount: data.debt,
                withdrawAsset: collateral,
                withdrawAmount: amount
            });

        _process(corePlugin, coreConfig, user, params, data, loanPlugin, swapPlugin, mode);

        bytes memory hook = IFlashLoanPlugin(loanPlugin).hook();

        assembly {
            return(add(hook, 32), mload(hook))
        }
    }

    /**
     * @notice Initializes the adapter with flash loan, swap, and core plugins
     * @param _plugins Array of plugin configurations containing endpoints and their callback selectors
     * @param _wEth Address of the Wrapped ETH (WETH) token
     * @param _treasury Address of the treasury for rescued funds
     * @dev Each plugin must have a valid non-zero callback selector
     */
    constructor(IS.Plugin[] memory _plugins, address _wEth, address _treasury) payable {
        require(_wEth != address(0), IA.InvalidWeth());
        require(_treasury != address(0), IA.InvalidTreasury());

        treasury = _treasury;
        wEth = _wEth;

        bytes4 pluginSelector;

        for (uint256 i = 0; i < _plugins.length; ++i) {
            IS.Plugin memory plugin = _plugins[i];

            // aderyn-fp-next-line(reentrancy-state-change)
            if (IERC165(plugin.endpoint).supportsInterface(type(IFlashLoanPlugin).interfaceId)) {
                // aderyn-fp-next-line(reentrancy-state-change)
                pluginSelector = IFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR();
            }
            // aderyn-fp-next-line(reentrancy-state-change)
            else if (IERC165(plugin.endpoint).supportsInterface(type(ISwapPlugin).interfaceId)) {
                // aderyn-fp-next-line(reentrancy-state-change)
                pluginSelector = ISwapPlugin(plugin.endpoint).SWAP_SELECTOR();
            }
            // aderyn-fp-next-line(reentrancy-state-change)
            else if (IERC165(plugin.endpoint).supportsInterface(type(ICorePlugin).interfaceId)) {
                // aderyn-fp-next-line(reentrancy-state-change)
                pluginSelector = ICorePlugin(plugin.endpoint).CORE_SELECTOR();
            } else {
                revert IA.UnknownPlugin();
            }

            bytes32 key = keccak256(abi.encodePacked(plugin.endpoint, pluginSelector));
            // aderyn-fp-next-line(reentrancy-state-change)
            plugins[key] = abi.encodePacked(PLUGIN_MAGIC, plugin.config);

            emit IE.PluginAdded(plugin.endpoint, pluginSelector, key);
        }
    }

    /*///////////////////////////////////////////////////////////////
                               EXTERNAL
    ////////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IExchange
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function exchange(
        IS.Options calldata opts,
        IERC20 fromAsset,
        IERC20 toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData
    ) external nonReentrant {
        _exchange(opts, fromAsset, toAsset, fromAmount, minAmountOut, maxHealthFactorDrop, swapData);
    }

    /**
     * @inheritdoc IExchange
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function exchange(
        IS.Options calldata opts,
        IERC20 fromAsset,
        IERC20 toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData,
        IS.AllowParams calldata allowParams
    ) external nonReentrant {
        _allow(opts.corePlugin, _marketData(opts), allowParams);
        _exchange(opts, fromAsset, toAsset, fromAmount, minAmountOut, maxHealthFactorDrop, swapData);
    }

    /**
     * @inheritdoc IMultiplier
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function multiply(
        IS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData
    ) external payable nonReentrant {
        _multiply(opts, collateral, collateralAmount, baseAmount, maxHealthFactorDrop, swapData);
    }

    /**
     * @inheritdoc IMultiplier
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function multiply(
        IS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData,
        IS.AllowParams calldata allowParams
    ) external payable nonReentrant {
        _allow(opts.corePlugin, _marketData(opts), allowParams);
        _multiply(opts, collateral, collateralAmount, baseAmount, maxHealthFactorDrop, swapData);
    }

    /**
     * @inheritdoc ICover
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function cover(
        IS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint16 slippageBps,
        bytes calldata swapData
    ) external nonReentrant {
        _cover(opts, collateral, collateralAmount, swapData, slippageBps);
    }

    /**
     * @inheritdoc ICover
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function cover(
        IS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint16 slippageBps,
        bytes calldata swapData,
        IS.AllowParams calldata allowParams
    ) external nonReentrant {
        _allow(opts.corePlugin, _marketData(opts), allowParams);
        _cover(opts, collateral, collateralAmount, swapData, slippageBps);
    }

    /**
     * @inheritdoc IFoundation
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function rescue(IERC20 token) external {
        uint256 amount;
        if (address(token) == address(0)) {
            amount = address(this).balance;
        } else {
            amount = token.balanceOf(address(this));
        }
        _dust(treasury, token, address(0), bytes(""), amount);
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Encodes market data for core plugin calls
     * @param opts The options containing market and coreConfig
     * @return Encoded market data for core plugin
     */
    function _marketData(IS.Options calldata opts) internal pure returns (bytes memory) {
        return abi.encodePacked(opts.market, opts.coreConfig);
    }

    /**
     * @notice Internal implementation of exchange
     */
    function _exchange(
        IS.Options calldata opts,
        IERC20 fromAsset,
        IERC20 toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData
    ) internal {
        address corePlugin = opts.corePlugin;
        bytes memory marketData = _marketData(opts);

        _validateExchange(
            corePlugin,
            marketData,
            address(fromAsset),
            address(toAsset),
            fromAmount,
            minAmountOut,
            maxHealthFactorDrop
        );

        address loanPlugin = opts.loanPlugin;

        _tstore(
            toAsset.balanceOf(address(this)),
            loanPlugin,
            opts.swapPlugin,
            corePlugin,
            fromAsset,
            fromAmount,
            msg.sender,
            IS.Mode.EXCHANGE,
            marketData
        );

        _loan(
            loanPlugin,
            IS.CallbackData({ debt: minAmountOut, fee: 0, flp: address(0), asset: toAsset, swapData: swapData })
        );
    }

    /**
     * @notice Internal implementation of multiply
     */
    function _multiply(
        IS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData
    ) internal {
        address corePlugin = opts.corePlugin;
        bytes memory marketData = _marketData(opts);

        require(corePlugin != address(0), IA.InvalidCorePlugin());
        require(maxHealthFactorDrop < PRECISION, IA.InvalidMultiplyParameters());

        if (msg.value > 0) {
            require(address(collateral) == wEth, IA.InvalidWeth());
            collateralAmount = msg.value;
            IWEth(wEth).deposit{ value: msg.value }();
        } else {
            uint256 balanceBefore = collateral.balanceOf(address(this));
            collateral.safeTransferFrom(msg.sender, address(this), collateralAmount);
            collateralAmount = collateral.balanceOf(address(this)) - balanceBefore;
        }

        uint256 leveraged = _leveraged(corePlugin, marketData, collateral, collateralAmount);

        require(
            leveraged + baseAmount <=
                Math.mulDiv(
                    leveraged,
                    _maxLeverage(corePlugin, marketData, collateral, maxHealthFactorDrop),
                    FACTOR_SCALE
                ),
            IA.InvalidLeverage()
        );

        IERC20 baseAsset = _baseToken(corePlugin, marketData);
        address loanPlugin = opts.loanPlugin;

        _tstore(
            baseAsset.balanceOf(address(this)),
            loanPlugin,
            opts.swapPlugin,
            corePlugin,
            collateral,
            collateralAmount,
            msg.sender,
            IS.Mode.MULTIPLY,
            marketData
        );

        _loan(
            loanPlugin,
            IS.CallbackData({
                debt: baseAmount,
                fee: 0, // to be handled by plugin
                flp: address(0), // to be handled by plugin
                asset: baseAsset,
                swapData: swapData
            })
        );
    }

    /**
     * @notice Internal implementation of cover
     */
    function _cover(
        IS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint16 slippageBps
    ) internal {
        address corePlugin = opts.corePlugin;
        bytes memory marketData = _marketData(opts);

        require(corePlugin != address(0), IA.InvalidCorePlugin());

        uint256 repayAmount = _borrowBalanceOf(corePlugin, marketData, msg.sender);
        require(repayAmount > 0, IA.NothingToDeleverage());

        uint256 loanDebt;
        if (collateralAmount == type(uint256).max) {
            loanDebt = repayAmount;
            collateralAmount = _collateralBalanceOf(corePlugin, marketData, msg.sender, collateral);
        } else {
            require(
                collateralAmount <= _collateralBalanceOf(corePlugin, marketData, msg.sender, collateral),
                IA.InvalidAmountIn()
            );
            loanDebt = Math.min(
                _convert(corePlugin, marketData, collateral, collateralAmount, slippageBps),
                repayAmount
            );
        }
        require(loanDebt > 0, IA.InvalidLeverage());

        IERC20 baseAsset = _baseToken(corePlugin, marketData);
        address loanPlugin = opts.loanPlugin;

        _tstore(
            baseAsset.balanceOf(address(this)),
            loanPlugin,
            opts.swapPlugin,
            corePlugin,
            collateral,
            collateralAmount,
            msg.sender,
            IS.Mode.COVER,
            marketData
        );

        _loan(
            loanPlugin,
            IS.CallbackData({
                debt: loanDebt,
                fee: 0, // to be handled by plugin
                flp: address(0), // to be handled by plugin
                asset: baseAsset,
                swapData: swapData
            })
        );
    }

    /**
     * @notice Processes a flash loan operation including optional token swaps and collateral management
     * @param corePlugin Address of the core lending protocol plugin
     * @param coreConfig Encoded configuration for the core plugin
     * @param user The address of the user performing the operation
     * @param params Parameters for supplying and withdrawing collateral
     * @param data Callback data containing flash loan details and swap information
     * @param loanPlugin Address of the flash loan plugin to use
     * @param swapPlugin Address of the swap plugin to use
     * @param mode Operation mode, either MULTIPLY (supply) or COVER
     */
    function _process(
        address corePlugin,
        bytes memory coreConfig,
        address user,
        IS.ProcessParams memory params,
        IS.CallbackData memory data,
        address loanPlugin,
        address swapPlugin,
        IS.Mode mode
    ) internal {
        uint256 repaymentAmount = data.debt + data.fee;
        uint256 amountOut;
        uint256 dust;

        if (mode == IS.Mode.MULTIPLY) {
            (amountOut, dust) = _swap(swapPlugin, data.asset, params.supplyAsset, data.debt, data.swapData);
            _dust(user, data.asset, address(0), bytes(""), dust);

            params.supplyAmount += amountOut;

            _supplyWithdraw(corePlugin, coreConfig, user, params);

            emit IE.Multiplied(user, corePlugin, address(params.supplyAsset), params.supplyAmount, data.debt);
        } else {
            _supplyWithdraw(corePlugin, coreConfig, user, params);

            (amountOut, dust) = _swap(
                swapPlugin,
                params.withdrawAsset,
                data.asset,
                params.withdrawAmount,
                data.swapData
            );

            _dust(user, params.withdrawAsset, address(0), bytes(""), dust);

            require(amountOut >= repaymentAmount, IA.InvalidAmountOut());

            dust = amountOut - repaymentAmount;

            _dust(user, data.asset, mode == IS.Mode.EXCHANGE ? corePlugin : address(0), coreConfig, dust);

            if (mode == IS.Mode.COVER) {
                emit IE.Covered(user, corePlugin, address(params.withdrawAsset), params.withdrawAmount, dust);
            } else if (mode == IS.Mode.EXCHANGE) {
                emit IE.Exchanged(
                    user,
                    corePlugin,
                    address(params.withdrawAsset),
                    address(data.asset),
                    params.withdrawAmount,
                    amountOut
                );
            } else {
                revert IA.InvalidMode();
            }
        }

        _repay(loanPlugin, data.flp, data.asset, repaymentAmount);
    }

    /**
     * @notice Supplies and withdraws assets from the lending market on behalf of a user
     * @param corePlugin Address of the core lending protocol plugin
     * @param coreConfig Encoded configuration for the core plugin
     * @param user The address of the user performing the operation
     * @param params Parameters for supplying and withdrawing collateral
     */
    function _supplyWithdraw(
        address corePlugin,
        bytes memory coreConfig,
        address user,
        IS.ProcessParams memory params
    ) internal {
        params.supplyAsset.safeIncreaseAllowance(corePlugin, params.supplyAmount);

        (bool ok, ) = corePlugin.delegatecall(
            abi.encodeWithSelector(
                ICorePlugin.supplyTo.selector,
                coreConfig,
                user,
                params.supplyAsset,
                params.supplyAmount
            )
        );
        _catch(ok);

        (ok, ) = corePlugin.delegatecall(
            abi.encodeWithSelector(
                ICorePlugin.withdrawFrom.selector,
                coreConfig,
                user,
                address(this),
                params.withdrawAsset,
                params.withdrawAmount
            )
        );
        _catch(ok);
    }

    /**
     * @notice Executes a token swap using the configured swap plugin
     * @param swapPlugin Address of the swap plugin to use
     * @param srcToken Address of the source token to swap from
     * @param dstToken Address of the destination token to swap to
     * @param amount Amount of source tokens to swap
     * @param swapData Encoded parameters for the swap execution
     * @return amountOut Actual amount of destination tokens received
     * @return dust Leftover source tokens after swap
     */
    function _swap(
        address swapPlugin,
        IERC20 srcToken,
        IERC20 dstToken,
        uint256 amount,
        bytes memory swapData
    ) internal returns (uint256 amountOut, uint256 dust) {
        require(swapPlugin != address(0), IA.UnknownPlugin());

        uint256 balanceBefore = srcToken.balanceOf(address(this));

        (bool ok, bytes memory data) = address(swapPlugin).delegatecall(
            abi.encodeWithSelector(
                ISwapPlugin.swap.selector,
                srcToken,
                dstToken,
                amount,
                _config(swapPlugin, ISwapPlugin.SWAP_SELECTOR.selector),
                swapData
            )
        );
        _catch(ok);

        uint256 balanceAfter = srcToken.balanceOf(address(this));
        uint256 delt = balanceBefore - amount;
        if (delt < balanceAfter) {
            dust = balanceAfter - delt;
        }

        (amountOut) = abi.decode(data, (uint256));
    }

    /**
     * @notice Initiates a flash loan using the specified plugin
     * @param loanPlugin Address of the flash loan plugin
     * @param data Callback data to be passed to the flash loan callback
     */
    function _loan(address loanPlugin, IS.CallbackData memory data) internal {
        require(loanPlugin != address(0), IA.UnknownPlugin());
        (bool ok, ) = loanPlugin.delegatecall(
            abi.encodeWithSelector(
                IFlashLoanPlugin.takeFlashLoan.selector,
                data,
                _config(loanPlugin, IFlashLoanPlugin.CALLBACK_SELECTOR.selector)
            )
        );
        _catch(ok);
    }

    /**
     * @notice Repays a flash loan to the specified plugin
     * @param loanPlugin Address of the flash loan plugin
     * @param flp Address of the flash loan provider
     * @param baseAsset Address of the borrowed asset
     * @param amount Total amount to repay (principal + fee)
     */
    function _repay(address loanPlugin, address flp, IERC20 baseAsset, uint256 amount) internal {
        require(loanPlugin != address(0), IA.UnknownPlugin());
        (bool ok, ) = loanPlugin.delegatecall(
            abi.encodeWithSelector(IFlashLoanPlugin.repayFlashLoan.selector, flp, baseAsset, amount)
        );
        _catch(ok);
    }

    /**
     * @notice Callback on loan plugin via delegatecall
     */
    function _callback(address loanPlugin, bytes calldata data) internal returns (IS.CallbackData memory) {
        require(loanPlugin != address(0), IA.UnknownPlugin());
        (bool ok, bytes memory payload) = loanPlugin.delegatecall(data);
        _catch(ok);
        return abi.decode(payload, (IS.CallbackData));
    }

    /**
     * @notice Handles any leftover tokens by either supplying to market or transferring to the user
     * @param user Address of the user to receive leftover tokens
     * @param asset The ERC20 token to handle
     * @param corePlugin The core plugin address (or address(0) if supply not needed)
     * @param coreConfig Encoded configuration for the core plugin
     * @param amount Amount of tokens to handle
     */
    function _dust(address user, IERC20 asset, address corePlugin, bytes memory coreConfig, uint256 amount) internal {
        if (amount == 0) return;

        if (address(asset) == address(0)) {
            (bool ok, ) = payable(user).call{ value: amount }("");
            _catch(ok);
        } else if (corePlugin == address(0)) {
            asset.safeTransfer(user, amount);
        } else {
            IERC20 baseAsset = _baseToken(corePlugin, coreConfig);

            if (asset == baseAsset) {
                asset.safeTransfer(user, amount);
            } else {
                asset.safeIncreaseAllowance(corePlugin, amount);
                (bool ok, ) = corePlugin.delegatecall(
                    abi.encodeWithSelector(ICorePlugin.supplyTo.selector, coreConfig, user, asset, amount)
                );
                _catch(ok);
            }
        }

        emit IE.Dust(user, address(asset), corePlugin, amount);
    }

    /**
     * @notice Grants allowance to the foundation contract via signature
     * @param corePlugin Address of the core lending protocol plugin
     * @param marketData Encoded market data for the core plugin
     * @param allowParams Parameters for the allowance signature
     */
    function _allow(address corePlugin, bytes memory marketData, IS.AllowParams calldata allowParams) internal {
        (bool ok, ) = corePlugin.delegatecall(
            abi.encodeWithSelector(
                ICorePlugin.allowBySig.selector,
                marketData,
                msg.sender,
                address(this),
                true,
                allowParams.nonce,
                allowParams.expiry,
                allowParams.v,
                allowParams.r,
                allowParams.s
            )
        );
        _catch(ok);
    }

    /**
     * @notice Validates parameters for a collateral swap to ensure health factor is maintained
     */
    function _validateExchange(
        address corePlugin,
        bytes memory marketData,
        address fromAsset,
        address toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop
    ) internal view {
        address baseAsset = address(_baseToken(corePlugin, marketData));

        require(
            fromAsset != address(0) &&
                toAsset != address(0) &&
                fromAsset != baseAsset &&
                toAsset != baseAsset &&
                fromAsset != toAsset &&
                minAmountOut > 0 &&
                maxHealthFactorDrop < PRECISION,
            IA.InvalidSwapParameters()
        );

        require(
            Math.mulDiv(
                _calculateLiquidity(
                    corePlugin,
                    marketData,
                    fromAmount,
                    _getAssetInfo(corePlugin, marketData, IERC20(fromAsset))
                ),
                (PRECISION - maxHealthFactorDrop),
                PRECISION
            ) <
                _calculateLiquidity(
                    corePlugin,
                    marketData,
                    minAmountOut,
                    _getAssetInfo(corePlugin, marketData, IERC20(toAsset))
                ),
            IA.InsufficientLiquidity()
        );
    }

    /**
     * @notice Calculates the liquidity contribution of a given asset amount
     */
    function _calculateLiquidity(
        address corePlugin,
        bytes memory marketData,
        uint256 amount,
        ICorePlugin.AssetInfo memory assetInfo
    ) private view returns (uint256) {
        return
            Math.mulDiv(
                Math.mulDiv(amount, _getPrice(corePlugin, marketData, assetInfo.priceFeed), assetInfo.scale),
                assetInfo.borrowCollateralFactor,
                FACTOR_SCALE
            );
    }

    /**
     * @notice Calculates the required loan amount for a given leverage ratio
     */
    function _leveraged(
        address corePlugin,
        bytes memory marketData,
        IERC20 collateral,
        uint256 collateralAmount
    ) private view returns (uint256) {
        ICorePlugin.AssetInfo memory info = _getAssetInfo(corePlugin, marketData, collateral);

        return
            Math.mulDiv(
                Math.mulDiv(
                    collateralAmount,
                    _getPrice(corePlugin, marketData, info.priceFeed),
                    // aderyn-fp-next-line(literal-instead-of-constant)
                    10 ** AggregatorV3Interface(info.priceFeed).decimals()
                ),
                _baseScale(corePlugin, marketData),
                info.scale
            );
    }

    function _maxLeverage(
        address corePlugin,
        bytes memory marketData,
        IERC20 collateral,
        uint256 maxHealthFactorDrop
    ) internal view returns (uint256) {
        ICorePlugin.AssetInfo memory info = _getAssetInfo(corePlugin, marketData, collateral);
        return
            Math.mulDiv(
                Math.mulDiv(FACTOR_SCALE, FACTOR_SCALE, FACTOR_SCALE - uint256(info.borrowCollateralFactor)),
                PRECISION - maxHealthFactorDrop,
                PRECISION
            );
    }

    /**
     * @notice Converts between collateral and base asset amounts using prices
     */
    function _convert(
        address corePlugin,
        bytes memory marketData,
        IERC20 collateral,
        uint256 collateralAmount,
        uint16 slippageBps
    ) private view returns (uint256) {
        ICorePlugin.AssetInfo memory info = _getAssetInfo(corePlugin, marketData, collateral);
        address priceFeed = info.priceFeed;

        uint256 raw = Math.mulDiv(
            Math.mulDiv(
                collateralAmount,
                _getPrice(corePlugin, marketData, priceFeed),
                10 ** AggregatorV3Interface(priceFeed).decimals()
            ),
            _baseScale(corePlugin, marketData),
            info.scale
        );

        return Math.mulDiv(raw, PRECISION - slippageBps, PRECISION);
    }

    /*//////////////////////////////////////////////////////////////
                          CORE PLUGIN HELPERS
    //////////////////////////////////////////////////////////////*/

    function _baseToken(address corePlugin, bytes memory marketData) internal view returns (IERC20) {
        return ICorePlugin(corePlugin).baseToken(marketData);
    }

    function _baseScale(address corePlugin, bytes memory marketData) internal view returns (uint256) {
        return ICorePlugin(corePlugin).baseScale(marketData);
    }

    function _borrowBalanceOf(
        address corePlugin,
        bytes memory marketData,
        address account
    ) internal view returns (uint256) {
        return ICorePlugin(corePlugin).borrowBalanceOf(marketData, account);
    }

    function _collateralBalanceOf(
        address corePlugin,
        bytes memory marketData,
        address account,
        IERC20 asset
    ) internal view returns (uint256) {
        return ICorePlugin(corePlugin).collateralBalanceOf(marketData, account, asset);
    }

    function _getAssetInfo(
        address corePlugin,
        bytes memory marketData,
        IERC20 asset
    ) internal view returns (ICorePlugin.AssetInfo memory) {
        return ICorePlugin(corePlugin).getAssetInfo(marketData, asset);
    }

    function _getPrice(address corePlugin, bytes memory marketData, address priceFeed) internal view returns (uint256) {
        return ICorePlugin(corePlugin).getPrice(marketData, priceFeed);
    }

    /*//////////////////////////////////////////////////////////////
                              UTILITIES
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Retrieves and validates plugin configuration from storage
     */
    function _config(address plugin, bytes4 selector) internal view returns (bytes memory config) {
        (bool ok, bytes memory data) = plugin.staticcall(abi.encodeWithSelector(selector));
        if (!ok) {
            revert IA.UnknownPlugin();
        }

        assembly {
            selector := mload(add(data, 32))
        }
        require(selector != bytes4(0), IA.UnknownPlugin());
        bytes memory configWithMagic = plugins[keccak256(abi.encodePacked(plugin, selector))];

        require(configWithMagic.length > 0, IA.UnknownPlugin());
        require(configWithMagic[0] == PLUGIN_MAGIC, IA.UnknownPlugin());
        assembly {
            let len := mload(configWithMagic)
            config := add(configWithMagic, 1)
            mstore(config, sub(len, 1))
        }
    }

    /**
     * @notice Handles failed external calls by reverting with the original error
     */
    function _catch(bool ok) internal pure {
        if (!ok) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }
    }

    /**
     * @notice Stores operation parameters in transient storage for callback access
     */
    function _tstore(
        uint256 snapshot,
        address loanPlugin,
        address swapPlugin,
        address corePlugin,
        IERC20 collateral,
        uint256 amount,
        address user,
        IS.Mode mode,
        bytes memory coreConfig
    ) internal {
        bytes32 fslot = SLOT_FOUNDATION;
        bytes32 cslot = SLOT_CORE;

        assembly {
            tstore(fslot, mode)
            tstore(add(fslot, SNAPSHOT_OFFSET), snapshot)
            tstore(add(fslot, LOAN_PLUGIN_OFFSET), loanPlugin)
            tstore(add(fslot, SWAP_PLUGIN_OFFSET), swapPlugin)
            tstore(add(fslot, CORE_PLUGIN_OFFSET), corePlugin)
            tstore(add(fslot, ASSET_OFFSET), collateral)
            tstore(add(fslot, AMOUNT_OFFSET), amount)
            tstore(add(fslot, USER_OFFSET), user)
        }

        // Store coreConfig length and data in transient storage
        uint256 configLen = coreConfig.length;
        assembly {
            tstore(cslot, configLen)
        }

        // Store config data in chunks
        for (uint256 i = 0; i < configLen; i += 32) {
            bytes32 chunk;
            assembly {
                chunk := mload(add(add(coreConfig, 32), i))
            }
            assembly {
                tstore(add(cslot, add(32, i)), chunk)
            }
        }
    }

    /**
     * @notice Retrieves and clears operation parameters from transient storage
     */
    function _tload()
        internal
        returns (
            uint256 snapshot,
            address loanPlugin,
            address swapPlugin,
            address corePlugin,
            IERC20 collateral,
            uint256 amount,
            address user,
            IS.Mode mode,
            bytes memory coreConfig
        )
    {
        bytes32 fslot = SLOT_FOUNDATION;
        bytes32 cslot = SLOT_CORE;
        uint256 configLen;

        assembly {
            mode := tload(fslot)
            snapshot := tload(add(fslot, SNAPSHOT_OFFSET))
            loanPlugin := tload(add(fslot, LOAN_PLUGIN_OFFSET))
            swapPlugin := tload(add(fslot, SWAP_PLUGIN_OFFSET))
            corePlugin := tload(add(fslot, CORE_PLUGIN_OFFSET))
            collateral := tload(add(fslot, ASSET_OFFSET))
            amount := tload(add(fslot, AMOUNT_OFFSET))
            user := tload(add(fslot, USER_OFFSET))
            configLen := tload(fslot)

            // Clear transient storage
            tstore(fslot, 0)
            tstore(add(fslot, SNAPSHOT_OFFSET), 0)
            tstore(add(fslot, LOAN_PLUGIN_OFFSET), 0)
            tstore(add(fslot, SWAP_PLUGIN_OFFSET), 0)
            tstore(add(fslot, CORE_PLUGIN_OFFSET), 0)
            tstore(add(fslot, ASSET_OFFSET), 0)
            tstore(add(fslot, AMOUNT_OFFSET), 0)
            tstore(add(fslot, USER_OFFSET), 0)
            tstore(cslot, 0)
        }

        // Reconstruct coreConfig from transient storage
        coreConfig = new bytes(configLen);
        for (uint256 i = 0; i < configLen; i += 32) {
            bytes32 chunk;
            assembly {
                chunk := tload(add(cslot, add(32, i)))
                tstore(add(cslot, add(32, i)), 0)
            }
            assembly {
                mstore(add(add(coreConfig, 32), i), chunk)
            }
        }
    }
}
