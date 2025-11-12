// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import { IComet } from "./external/compound/IComet.sol";
import { IWEth } from "./external/weth/IWEth.sol";

import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";

import { ICometExchange } from "./interfaces/ICometExchange.sol";
import { ICometMultiplier } from "./interfaces/ICometMultiplier.sol";
import { ICometCover } from "./interfaces/ICometCover.sol";

import { ICometStructs as ICS } from "./interfaces/ICometStructs.sol";
import { ICometAlerts as ICA } from "./interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "./interfaces/ICometEvents.sol";
import { ICometFoundation } from "./interfaces/ICometFoundation.sol";

/**
 * @title CometFoundation
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice This contract serves as a foundational component for managing plugins that facilitate flash loans and token swaps.
 * It maintains a registry of supported plugins, each identified by a unique key derived from the plugin's address and callback selector.
 * The contract provides internal functions to validate and interact with these plugins, ensuring secure and modular integration with various DeFi protocols.
 */
// aderyn-fp-next-line(locked-ether)
contract CometFoundation is ICometFoundation, ICometExchange, ICometMultiplier, ICometCover, ReentrancyGuard {
    using SafeERC20 for IERC20;
    /// @dev The scale for factors
    uint64 public constant FACTOR_SCALE = 1e18;
    uint16 public constant PRECISION = 1e4;
    uint16 public constant MAX_LEVERAGE = 10; // 10x

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
    uint8 internal constant MARKET_OFFSET = 0x80;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant ASSET_OFFSET = 0xA0;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant AMOUNT_OFFSET = 0xC0;
    // aderyn-fp-next-line(unused-state-variable)
    uint8 internal constant USER_OFFSET = 0xE0;

    /// @notice Storage slot for transient data, derived from contract name hash
    bytes32 internal constant SLOT_FOUNDATION = bytes32(uint256(keccak256("CometFoundation.storage")) - 1);

    /**
     * @inheritdoc ICometFoundation
     */
    address public immutable wEth;

    /**
     * @inheritdoc ICometFoundation
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
            IComet comet,
            IERC20 collateral,
            uint256 amount,
            address user,
            ICS.Mode mode
        ) = _tload();

        require(comet != IComet(address(0)), ICA.InvalidComet());

        ICS.CallbackData memory data = _callback(loanPlugin, msg.data);
        require(data.asset.balanceOf(address(this)) >= snapshot + data.debt, ICA.InvalidAmountOut());

        ICS.ProcessParams memory params = mode == ICS.Mode.MULTIPLY
            ? ICS.ProcessParams({
                supplyAsset: collateral,
                supplyAmount: amount,
                withdrawAsset: data.asset,
                withdrawAmount: data.debt + data.fee
            })
            : ICS.ProcessParams({
                supplyAsset: data.asset,
                supplyAmount: data.debt,
                withdrawAsset: collateral,
                withdrawAmount: amount
            });

        _process(comet, user, params, data, loanPlugin, swapPlugin, mode);

        bytes memory hook = ICometFlashLoanPlugin(loanPlugin).hook();

        assembly {
            return(add(hook, 32), mload(hook))
        }
    }

    /**
     * @notice Initializes the adapter with flash loan and swap plugins
     * @param _plugins Array of plugin configurations containing endpoints and their callback selectors
     * @param _wEth Address of the Wrapped ETH (WETH) token
     * @dev Each plugin must have a valid non-zero callback selector
     */
    constructor(ICS.Plugin[] memory _plugins, address _wEth, address _treasury) payable {
        require(_wEth != address(0), ICA.InvalidWeth());
        require(_treasury != address(0), ICA.InvalidTreasury());

        treasury = _treasury;
        wEth = _wEth;

        bytes4 pluginSelector;

        for (uint256 i = 0; i < _plugins.length; ++i) {
            ICS.Plugin memory plugin = _plugins[i];

            // aderyn-fp-next-line(reentrancy-state-change)
            if (IERC165(plugin.endpoint).supportsInterface(type(ICometFlashLoanPlugin).interfaceId)) {
                // aderyn-fp-next-line(reentrancy-state-change)
                pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR();
            }
            // aderyn-fp-next-line(reentrancy-state-change)
            else if (IERC165(plugin.endpoint).supportsInterface(type(ICometSwapPlugin).interfaceId)) {
                // aderyn-fp-next-line(reentrancy-state-change)
                pluginSelector = ICometSwapPlugin(plugin.endpoint).SWAP_SELECTOR();
            } else {
                revert ICA.UnknownPlugin();
            }

            bytes32 key = keccak256(abi.encodePacked(plugin.endpoint, pluginSelector));
            // aderyn-fp-next-line(reentrancy-state-change)
            plugins[key] = abi.encodePacked(PLUGIN_MAGIC, plugin.config);

            emit ICE.PluginAdded(plugin.endpoint, pluginSelector, key);
        }
    }

    /*///////////////////////////////////////////////////////////////
                               EXTERNAL
    ////////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc ICometExchange
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function exchange(
        ICS.Options calldata opts,
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
     * @inheritdoc ICometExchange
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function exchange(
        ICS.Options calldata opts,
        IERC20 fromAsset,
        IERC20 toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external nonReentrant {
        _allow(opts.comet, allowParams);
        _exchange(opts, fromAsset, toAsset, fromAmount, minAmountOut, maxHealthFactorDrop, swapData);
    }

    /**
     * @inheritdoc ICometMultiplier
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function multiply(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        bytes calldata swapData
    ) external payable nonReentrant {
        _multiply(opts, collateral, collateralAmount, baseAmount, swapData);
    }

    /**
     * @inheritdoc ICometMultiplier
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function multiply(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external payable nonReentrant {
        _allow(opts.comet, allowParams);
        _multiply(opts, collateral, collateralAmount, baseAmount, swapData);
    }

    /**
     * @inheritdoc ICometCover
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function cover(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        bytes calldata swapData
    ) external nonReentrant {
        _cover(opts, collateral, collateralAmount, swapData);
    }

    /**
     * @inheritdoc ICometCover
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function cover(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external nonReentrant {
        _allow(opts.comet, allowParams);
        _cover(opts, collateral, collateralAmount, swapData);
    }

    /**
     * @inheritdoc ICometFoundation
     */
    //  aderyn-fp-next-line(state-change-without-event)
    function rescue(IERC20 token) external {
        uint256 amount;
        if (address(token) == address(0)) {
            amount = address(this).balance;
        } else {
            amount = token.balanceOf(address(this));
        }
        _dust(treasury, token, IComet(address(0)), amount);
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Internal implementation of exchange
     */
    function _exchange(
        ICS.Options calldata opts,
        IERC20 fromAsset,
        IERC20 toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData
    ) internal {
        IComet comet = opts.comet;

        _validateExchange(comet, address(fromAsset), address(toAsset), fromAmount, minAmountOut, maxHealthFactorDrop);

        address loanPlugin = opts.loanPlugin;

        _tstore(
            toAsset.balanceOf(address(this)),
            loanPlugin,
            opts.swapPlugin,
            comet,
            fromAsset,
            fromAmount,
            msg.sender,
            ICS.Mode.EXCHANGE
        );

        _loan(
            loanPlugin,
            ICS.CallbackData({ debt: minAmountOut, fee: 0, flp: address(0), asset: toAsset, swapData: swapData })
        );
    }

    /**
     * @notice Internal implementation of multiply
     */
    function _multiply(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        bytes calldata swapData
    ) internal {
        IComet comet = opts.comet;
        require(address(comet) != address(0), ICA.InvalidComet());

        if (msg.value > 0) {
            require(address(collateral) == wEth, ICA.InvalidWeth());
            collateralAmount = msg.value;
            IWEth(wEth).deposit{ value: msg.value }();
        } else {
            collateral.safeTransferFrom(msg.sender, address(this), collateralAmount);
        }

        uint256 leveraged = _leveraged(comet, collateral, collateralAmount);

        require(leveraged + baseAmount <= leveraged * MAX_LEVERAGE, ICA.InvalidLeverage());
        IERC20 baseAsset = comet.baseToken();
        address loanPlugin = opts.loanPlugin;

        _tstore(
            baseAsset.balanceOf(address(this)),
            loanPlugin,
            opts.swapPlugin,
            comet,
            collateral,
            collateralAmount,
            msg.sender,
            ICS.Mode.MULTIPLY
        );

        _loan(
            loanPlugin,
            ICS.CallbackData({
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
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 collateralAmount,
        bytes calldata swapData
    ) internal {
        IComet comet = opts.comet;
        require(address(comet) != address(0), ICA.InvalidComet());

        uint256 repayAmount = comet.borrowBalanceOf(msg.sender);
        require(repayAmount > 0, ICA.NothingToDeleverage());

        uint256 loanDebt;
        if (collateralAmount == type(uint256).max) {
            loanDebt = repayAmount;
            collateralAmount = comet.collateralBalanceOf(msg.sender, collateral);
        } else {
            require(collateralAmount <= comet.collateralBalanceOf(msg.sender, collateral), ICA.InvalidAmountIn());
            loanDebt = Math.min(_convert(comet, collateral, collateralAmount), repayAmount);
        }
        require(loanDebt > 0, ICA.InvalidLeverage());

        IERC20 baseAsset = comet.baseToken();
        address loanPlugin = opts.loanPlugin;

        _tstore(
            baseAsset.balanceOf(address(this)),
            loanPlugin,
            opts.swapPlugin,
            comet,
            collateral,
            collateralAmount,
            msg.sender,
            ICS.Mode.COVER
        );

        _loan(
            loanPlugin,
            ICS.CallbackData({
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
     * @param comet The Comet market instance
     * @param user The address of the user performing the operation
     * @param params Parameters for supplying and withdrawing collateral
     * @param data Callback data containing flash loan details and swap information
     * @param loanPlugin Address of the flash loan plugin to use
     * @param swapPlugin Address of the swap plugin to use
     * @param mode Operation mode, either MULTIPLY (supply) or COVER
     * @dev This function orchestrates the entire flash loan _process, including taking the loan,
     * performing swaps, supplying/withdrawing collateral, and repaying the loan.
     * It uses transient storage to maintain state across the flash loan callback.
     */
    function _process(
        IComet comet,
        address user,
        ICS.ProcessParams memory params,
        ICS.CallbackData memory data,
        address loanPlugin,
        address swapPlugin,
        ICS.Mode mode
    ) internal {
        uint256 repaymentAmount = data.debt + data.fee;
        uint256 amountOut;
        uint256 dust;

        if (mode == ICS.Mode.MULTIPLY) {
            (amountOut, dust) = _swap(swapPlugin, data.asset, params.supplyAsset, data.debt, data.swapData);
            _dust(user, data.asset, IComet(address(0)), dust);

            params.supplyAmount += amountOut;

            _supplyWithdraw(comet, user, params);

            emit ICE.Multiplied(user, address(comet), address(params.supplyAsset), params.supplyAmount, data.debt);
        } else {
            _supplyWithdraw(comet, user, params);

            (amountOut, dust) = _swap(
                swapPlugin,
                params.withdrawAsset,
                data.asset,
                params.withdrawAmount,
                data.swapData
            );

            _dust(user, params.withdrawAsset, IComet(address(0)), dust);

            require(amountOut >= repaymentAmount, ICA.InvalidAmountOut());

            dust = amountOut - repaymentAmount;

            _dust(user, data.asset, mode == ICS.Mode.EXCHANGE ? comet : IComet(address(0)), dust);

            if (mode == ICS.Mode.COVER) {
                emit ICE.Covered(user, address(comet), address(params.withdrawAsset), params.withdrawAmount, dust);
            } else if (mode == ICS.Mode.EXCHANGE) {
                emit ICE.Exchanged(
                    user,
                    address(comet),
                    address(params.withdrawAsset),
                    address(data.asset),
                    params.withdrawAmount,
                    amountOut
                );
            } else {
                revert ICA.InvalidMode();
            }
        }

        _repay(loanPlugin, data.flp, data.asset, repaymentAmount);
    }

    /**
     * @notice Supplies and withdraws assets from the Comet market on behalf of a user
     * @param comet The Comet market instance
     * @param user The address of the user performing the operation
     * @param params Parameters for supplying and withdrawing collateral
     * @dev This function handles the actual supply and withdrawal of assets in the Comet market.
     */
    function _supplyWithdraw(IComet comet, address user, ICS.ProcessParams memory params) internal {
        params.supplyAsset.safeIncreaseAllowance(address(comet), params.supplyAmount);
        comet.supplyTo(user, params.supplyAsset, params.supplyAmount);
        comet.withdrawFrom(user, address(this), params.withdrawAsset, params.withdrawAmount);
    }

    /**
     * @notice Executes a token swap using the configured swap plugin
     * @param swapPlugin Address of the swap plugin to use
     * @param srcToken Address of the source token to swap from
     * @param dstToken Address of the destination token to swap to
     * @param amount Amount of source tokens to swap
     * @param swapData Encoded parameters for the swap execution
     * @return amountOut Actual amount of destination tokens received
     * @dev Uses delegatecall to execute swap in the context of this contract
     */
    function _swap(
        address swapPlugin,
        IERC20 srcToken,
        IERC20 dstToken,
        uint256 amount,
        bytes memory swapData
    ) internal returns (uint256 amountOut, uint256 dust) {
        require(swapPlugin != address(0), ICA.UnknownPlugin());

        uint256 balanceBefore = srcToken.balanceOf(address(this));

        (bool ok, bytes memory data) = address(swapPlugin).delegatecall(
            abi.encodeWithSelector(
                ICometSwapPlugin.swap.selector,
                srcToken,
                dstToken,
                amount,
                _config(swapPlugin, ICometSwapPlugin.SWAP_SELECTOR.selector),
                swapData
            )
        );

        if (balanceBefore < srcToken.balanceOf(address(this)) + amount) {
            dust = srcToken.balanceOf(address(this)) + amount - balanceBefore;
        }

        _catch(ok);

        (amountOut) = abi.decode(data, (uint256));
    }

    /**
     * @notice Initiates a flash loan using the specified plugin
     * @param loanPlugin Address of the flash loan plugin
     * @param data Callback data to be passed to the flash loan callback
     * @dev Uses delegatecall to execute the flash loan in this contract's context
     */
    function _loan(address loanPlugin, ICS.CallbackData memory data) internal {
        require(loanPlugin != address(0), ICA.UnknownPlugin());
        (bool ok, ) = loanPlugin.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.takeFlashLoan.selector,
                data,
                _config(loanPlugin, ICometFlashLoanPlugin.CALLBACK_SELECTOR.selector)
            )
        );
        _catch(ok);
    }

    /**
     * @notice Repays a flash loan to the specified plugin
     * @param flp Address of the flash loan provider
     * @param baseAsset Address of the borrowed asset
     * @param amount Total amount to repay (principal + fee)
     * @dev Uses delegatecall to invoke the repay function on the flash loan plugin
     */
    function _repay(address loanPlugin, address flp, IERC20 baseAsset, uint256 amount) internal {
        require(loanPlugin != address(0), ICA.UnknownPlugin());
        (bool ok, ) = loanPlugin.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector, flp, baseAsset, amount)
        );
        _catch(ok);
    }

    /**
     * @notice Callaback on loan plugin via delegatecall
     */
    function _callback(address loanPlugin, bytes calldata data) internal returns (ICS.CallbackData memory) {
        require(loanPlugin != address(0), ICA.UnknownPlugin());
        (bool ok, bytes memory payload) = loanPlugin.delegatecall(data);
        _catch(ok);
        return abi.decode(payload, (ICS.CallbackData));
    }

    /**
     * @notice Handles any leftover tokens by either supplying to Comet or transferring to the user
     * @param user Address of the user to receive leftover tokens
     * @param asset The ERC20 token to handle
     * @param comet The Comet market instance (or address(0) if supply not needed)
     * @param amount Amount of tokens to handle
     * @dev If comet is address(0), tokens are always transferred to user.
     * Otherwise, if asset is baseAsset, tokens are transferred; if collateral, they are supplied to Comet.
     */
    function _dust(address user, IERC20 asset, IComet comet, uint256 amount) internal {
        if (amount == 0) return;

        if (address(asset) == address(0)) {
            // aderyn-fp-next-line(unsafe-erc20-operation)
            payable(user).transfer(amount);
        } else if (address(comet) == address(0)) {
            asset.safeTransfer(user, amount);
        } else {
            IERC20 baseAsset = comet.baseToken();

            if (asset == baseAsset) {
                asset.safeTransfer(user, amount);
            } else {
                asset.safeIncreaseAllowance(address(comet), amount);
                comet.supplyTo(user, asset, amount);
            }
        }

        emit ICE.Dust(user, address(asset), address(comet), amount);
    }

    /**
     * @notice Grants allowance to the foundation contract via signature
     * @param comet The Comet comet interface
     * @param allowParams Parameters for the allowance signature
     * @dev Calls comet.allowBySig to set allowance for this contract
     */
    function _allow(IComet comet, ICS.AllowParams calldata allowParams) internal {
        comet.allowBySig(
            msg.sender,
            address(this),
            true,
            allowParams.nonce,
            allowParams.expiry,
            allowParams.v,
            allowParams.r,
            allowParams.s
        );
    }

    /**
     * @notice Validates parameters for a collateral swap to ensure health factor is maintained
     * @param comet The Comet comet interface
     * @param fromAsset The collateral asset being swapped from
     * @param toAsset The collateral asset being swapped to
     * @param fromAmount The amount of fromAsset to swap
     * @param minAmountOut The minimum acceptable amount of toAsset to receive
     * @param maxHealthFactorDrop The maximum allowed drop in health factor in basis points
     * @dev Reverts if any parameter is invalid or if the swap would violate health factor constraints
     */
    function _validateExchange(
        IComet comet,
        address fromAsset,
        address toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop
    ) internal view {
        address baseAsset = address(comet.baseToken());

        require(
            fromAsset != address(0) &&
                toAsset != address(0) &&
                fromAsset != baseAsset &&
                toAsset != baseAsset &&
                fromAsset != toAsset &&
                minAmountOut > 0 &&
                maxHealthFactorDrop < PRECISION,
            ICA.InvalidSwapParameters()
        );

        require(
            Math.mulDiv(
                _calculateLiquidity(comet, fromAmount, comet.getAssetInfoByAddress(IERC20(fromAsset))),
                (PRECISION - maxHealthFactorDrop),
                PRECISION
            ) < _calculateLiquidity(comet, minAmountOut, comet.getAssetInfoByAddress(IERC20(toAsset))),
            ICA.InsufficientLiquidity()
        );
    }

    /**
     * @notice Calculates the liquidity contribution of a given asset amount in the Comet market
     * @param comet The Comet comet interface
     * @param amount Amount of the asset to evaluate
     * @param assetInfo Asset information struct from Comet
     * @return Liquidity value of the asset amount in base asset terms
     * @dev Liquidity is calculated based on comet implementation.
     * Implementation: https://github.com/compound-finance/comet/blob/main/contracts/Comet.sol#L544-L553
     */
    function _calculateLiquidity(
        IComet comet,
        uint256 amount,
        IComet.AssetInfo memory assetInfo
    ) private view returns (uint256) {
        return
            Math.mulDiv(
                Math.mulDiv(amount, comet.getPrice(assetInfo.priceFeed), assetInfo.scale),
                assetInfo.borrowCollateralFactor,
                FACTOR_SCALE
            );
    }

    /**
     * @notice Calculates the required loan amount for a given leverage ratio
     * @param comet The Comet comet interface
     * @param collateral Address of the collateral token
     * @param collateralAmount Amount of collateral being supplied
     * @return Required loan amount in base asset terms
     * @dev Formula: loan = (initialValue * (leverage - 1)) / PRECISION
     */
    function _leveraged(IComet comet, IERC20 collateral, uint256 collateralAmount) private view returns (uint256) {
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(collateral);

        return
            // collateral value in base asset
            Math.mulDiv(
                Math.mulDiv(
                    collateralAmount,
                    comet.getPrice(info.priceFeed),
                    // aderyn-fp-next-line(literal-instead-of-constant)
                    10 ** AggregatorV3Interface(info.priceFeed).decimals()
                ),
                comet.baseScale(),
                info.scale
            );
    }

    /**
     * @notice Converts between collateral and base asset amounts using comet prices
     * @param comet The Comet comet interface
     * @param collateral Address of the collateral token
     * @param collateralAmount Amount to convert
     * @return Converted amount in the target denomination
     * @dev Accounts for collateral factors and price feed decimals in conversions
     */
    function _convert(IComet comet, IERC20 collateral, uint256 collateralAmount) private view returns (uint256) {
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(collateral);
        address priceFeed = info.priceFeed;

        uint256 num = comet.getPrice(priceFeed) * comet.baseScale() * uint256(info.borrowCollateralFactor);
        // aderyn-fp-next-line(literal-instead-of-constant)
        uint256 den = (10 ** AggregatorV3Interface(priceFeed).decimals() * info.scale) * FACTOR_SCALE;

        return Math.mulDiv(collateralAmount, num, den);
    }

    /**
     * @notice Retrieves and validates plugin configuration from storage
     * @param plugin Address of the plugin contract
     * @param selector Callback function selector for the plugin
     * @return config Plugin configuration data without magic byte
     * @dev Reverts if the plugin is unknown or the magic byte is invalid
     */
    function _config(address plugin, bytes4 selector) internal view returns (bytes memory config) {
        (bool ok, bytes memory data) = plugin.staticcall(abi.encodeWithSelector(selector));
        if (!ok) {
            revert ICA.UnknownPlugin();
        }

        assembly {
            selector := mload(add(data, 32))
        }
        require(selector != bytes4(0), ICA.UnknownPlugin());
        bytes memory configWithMagic = plugins[keccak256(abi.encodePacked(plugin, selector))];

        require(configWithMagic.length > 0, ICA.UnknownPlugin());
        require(configWithMagic[0] == PLUGIN_MAGIC, ICA.UnknownPlugin());
        assembly {
            let len := mload(configWithMagic)
            config := add(configWithMagic, 1)
            mstore(config, sub(len, 1))
        }
    }

    /**
     * @notice Handles failed external calls by reverting with the original error
     * @param ok Boolean indicating if the external call succeeded
     * @dev Preserves the original revert reason when delegatecalls or external calls fail
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
     * @param snapshot Base asset balance before flash loan
     * @param swapPlugin Address of the swap plugin
     * @param comet Address of the Comet comet
     * @param collateral Address of the collateral token
     * @param amount Collateral amount being processed
     * @param user Address of the user performing the operation
     * @param mode Operation mode (MULTIPLY or COVER)
     * @dev Uses EIP-1153 transient storage for gas-efficient temporary data storage
     */
    function _tstore(
        uint256 snapshot,
        address loanPlugin,
        address swapPlugin,
        IComet comet,
        IERC20 collateral,
        uint256 amount,
        address user,
        ICS.Mode mode
    ) internal {
        bytes32 slot = SLOT_FOUNDATION;
        assembly {
            tstore(slot, mode)
            tstore(add(slot, SNAPSHOT_OFFSET), snapshot)
            tstore(add(slot, LOAN_PLUGIN_OFFSET), loanPlugin)
            tstore(add(slot, SWAP_PLUGIN_OFFSET), swapPlugin)
            tstore(add(slot, MARKET_OFFSET), comet)
            tstore(add(slot, ASSET_OFFSET), collateral)
            tstore(add(slot, AMOUNT_OFFSET), amount)
            tstore(add(slot, USER_OFFSET), user)
        }
    }

    /**
     * @notice Retrieves and clears first operation parameters from transient storages
     * @return snapshot Base asset balance before flash loan
     * @return loanPlugin Address of the flashloan plugin
     * @return swapPlugin Address of the swap plugin
     * @return comet Address of the Comet comet
     * @return collateral Address of the collateral token
     * @return amount Collateral amount being processed
     * @return user Address of the user performing the operation
     * @return mode Operation mode (MULTIPLY or COVER)
     * @dev Automatically clears the storage slots after reading to prevent reuse
     */
    function _tload()
        internal
        returns (
            uint256 snapshot,
            address loanPlugin,
            address swapPlugin,
            IComet comet,
            IERC20 collateral,
            uint256 amount,
            address user,
            ICS.Mode mode
        )
    {
        bytes32 slot = SLOT_FOUNDATION;
        assembly {
            mode := tload(slot)
            snapshot := tload(add(slot, SNAPSHOT_OFFSET))
            loanPlugin := tload(add(slot, LOAN_PLUGIN_OFFSET))
            swapPlugin := tload(add(slot, SWAP_PLUGIN_OFFSET))
            comet := tload(add(slot, MARKET_OFFSET))
            collateral := tload(add(slot, ASSET_OFFSET))
            amount := tload(add(slot, AMOUNT_OFFSET))
            user := tload(add(slot, USER_OFFSET))
            tstore(slot, 0)
            tstore(add(slot, SNAPSHOT_OFFSET), 0)
            tstore(add(slot, LOAN_PLUGIN_OFFSET), 0)
            tstore(add(slot, SWAP_PLUGIN_OFFSET), 0)
            tstore(add(slot, MARKET_OFFSET), 0)
            tstore(add(slot, ASSET_OFFSET), 0)
            tstore(add(slot, AMOUNT_OFFSET), 0)
            tstore(add(slot, USER_OFFSET), 0)
        }
    }
}
