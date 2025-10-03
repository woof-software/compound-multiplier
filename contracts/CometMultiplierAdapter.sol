// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ICometMultiplierAdapter } from "./interfaces/ICometMultiplierAdapter.sol";
import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";

import { IWEth } from "./external/IWEth.sol";
import { IComet } from "./external/compound/IComet.sol";
import { AllowBySig } from "./base/AllowBySig.sol";

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CometMultiplierAdapter
 * @author WOOF!
 * @notice A leveraged position manager for Compound V3 (Comet) markets that enables users to
 *         create and unwind leveraged positions using flash loans and token swaps
 * @dev This contract uses a plugin architecture to support different flash loan providers and DEX aggregators.
 *      It leverages transient storage (EIP-1153) for gas-efficient temporary data storage during operations.
 */
contract CometMultiplierAdapter is ReentrancyGuard, AllowBySig, ICometMultiplierAdapter {
    using SafeERC20 for IERC20;

    /// @notice Precision constant for leverage calculations (represents 1x leverage)
    uint256 constant LEVERAGE_PRECISION = 10_000;

    /// @notice Offset constants for transient storage slots
    uint8 constant AMOUNT_OFFSET = 0x20;
    uint8 constant MARKET_OFFSET = 0x40;
    uint8 constant COLLATERAL_OFFSET = 0x60;
    uint8 constant MIN_AMOUNT_OUT_OFFSET = 0x80;
    uint8 constant SWAP_SELECTOR_OFFSET = 0xA0;

    /// @notice Storage slot for transient data, derived from contract name hash
    bytes32 constant SLOT_ADAPTER = bytes32(uint256(keccak256("CometMultiplierAdapter.adapter")) - 1);

    /// @notice Mapping of function selectors to their corresponding plugin configurations
    /// @dev Key is the callback selector, value contains plugin endpoint and configuration
    mapping(bytes4 => Plugin) public plugins;

    /// @notice Wrapped ETH (WETH) token address
    address public immutable wEth;

    /**
     * @notice Initializes the adapter with flash loan and swap plugins
     * @param _plugins Array of plugin configurations containing endpoints and their callback selectors
     * @dev Each plugin must have a valid non-zero callback selector
     */
    constructor(Plugin[] memory _plugins, address _wEth) {
        for (uint256 i = 0; i < _plugins.length; i++) {
            Plugin memory plugin = _plugins[i];
            bytes4 pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR();
            require(pluginSelector != bytes4(0), InvalidPluginSelector());
            plugins[pluginSelector] = plugin;
        }

        require(_wEth != address(0), InvalidAsset());

        wEth = _wEth;
    }

    /**
     * @notice Handles flash loan callbacks from registered plugins
     * @dev This function is called by flash loan providers during the loan execution.
     *      It validates the callback, decodes the data, and routes to appropriate execution logic.
     * @custom:security This function uses delegatecall to plugin endpoints, ensuring they execute in this contract's context
     */
    fallback() external payable {
        address endpoint = plugins[msg.sig].endpoint;
        require(endpoint != address(0), UnknownCallbackSelector());
        (bool ok, bytes memory payload) = endpoint.delegatecall(msg.data);
        _catch(ok);
        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));
        require(IERC20(data.asset).balanceOf(address(this)) >= data.snapshot + data.debt, InvalidAmountOut());

        bytes32 slot = SLOT_ADAPTER;
        Mode mode;
        assembly {
            mode := tload(slot)
        }

        if (mode == Mode.EXECUTE) {
            _execute(data, endpoint);
        } else if (mode == Mode.WITHDRAW) {
            _withdraw(data, endpoint);
        } else {
            revert InvalidMode();
        }
    }

    /**
     * @notice Allows the contract to receive ETH
     * @dev Required for receiving ETH from WETH unwrapping or native ETH operations
     */
    receive() external payable {}

    /**
     * @inheritdoc ICometMultiplierAdapter
     */
    function executeMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external payable nonReentrant {
        _executeMultiplier(opts, collateral, collateralAmount, leverage, swapData, minAmountOut);
    }

    /**
     * @inheritdoc ICometMultiplierAdapter
     */
    function executeMultiplierBySig(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut,
        AllowParams calldata allowParams
    ) external payable nonReentrant {
        _allowBySig(allowParams, opts.market);
        _executeMultiplier(opts, collateral, collateralAmount, leverage, swapData, minAmountOut);
    }

    /**
     * @inheritdoc ICometMultiplierAdapter
     */
    function withdrawMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external nonReentrant {
        _withdrawMultiplier(opts, collateral, collateralAmount, swapData, minAmountOut);
    }

    /**
     * @inheritdoc ICometMultiplierAdapter
     */
    function withdrawMultiplierBySig(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint256 minAmountOut,
        AllowParams calldata allowParams
    ) external nonReentrant {
        _allowBySig(allowParams, opts.market);
        _withdrawMultiplier(opts, collateral, collateralAmount, swapData, minAmountOut);
    }

    /**
     * @notice Internal implementation of executeMultiplier
     */
    function _executeMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) internal {
        Plugin memory plugin = plugins[opts.loanSelector];
        require(plugin.endpoint != address(0), InvalidPluginSelector());
        IComet comet = IComet(opts.market);

        if (msg.value > 0) {
            require(collateral == wEth, InvalidAsset());
            collateralAmount = msg.value;
            IWEth(wEth).deposit{ value: msg.value }();
        } else {
            IERC20(collateral).safeTransferFrom(msg.sender, address(this), collateralAmount);
        }

        uint256 leveraged = _leveraged(comet, collateral, collateralAmount, leverage);

        address baseAsset = comet.baseToken();

        _tstore(collateralAmount, opts.market, collateral, minAmountOut, opts.swapSelector, Mode.EXECUTE);

        _loan(
            plugin.endpoint,
            ICometFlashLoanPlugin.CallbackData({
                debt: leveraged,
                fee: 0, // to be handled by plugin
                snapshot: IERC20(baseAsset).balanceOf(address(this)),
                user: msg.sender,
                flp: opts.flp,
                asset: baseAsset,
                swapData: swapData
            }),
            plugin.config
        );
    }

    /**
     * @notice Internal implementation of withdrawMultiplier
     */
    function _withdrawMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint256 minAmountOut
    ) internal {
        Plugin memory loanPlugin = plugins[opts.loanSelector];
        IComet comet = IComet(opts.market);
        uint256 loanDebt;
        address baseAsset = comet.baseToken();

        uint256 repayAmount = comet.borrowBalanceOf(msg.sender);
        require(repayAmount > 0, NothingToDeleverage());
        if (collateralAmount == type(uint256).max) {
            loanDebt = repayAmount;
        } else {
            uint128 userBalance = comet.collateralBalanceOf(msg.sender, collateral);
            require(collateralAmount <= userBalance, InvalidCollateralAmount());
            loanDebt = Math.min(_convert(comet, collateral, collateralAmount), repayAmount);
        }

        require(loanDebt > 0, InvalidLeverage());

        _tstore(collateralAmount, opts.market, collateral, minAmountOut, opts.swapSelector, Mode.WITHDRAW);

        _loan(
            loanPlugin.endpoint,
            ICometFlashLoanPlugin.CallbackData({
                debt: loanDebt,
                fee: 0, // to be handled by plugin
                snapshot: IERC20(baseAsset).balanceOf(address(this)),
                user: msg.sender,
                flp: opts.flp,
                asset: baseAsset,
                swapData: swapData
            }),
            loanPlugin.config
        );
    }

    /**
     * @notice Executes the leveraged position creation during flash loan callback
     * @param data Flash loan callback data containing loan details and user information
     * @param endpoint Address of the flash loan plugin for repayment
     * @dev Internal function that:
     *      1. Swaps borrowed base asset to collateral
     *      2. Supplies total collateral (original + swapped) to Comet
     *      3. Withdraws base asset from user's position to repay the flash loan
     */
    function _execute(ICometFlashLoanPlugin.CallbackData memory data, address endpoint) private {
        (uint256 amount, IComet market, address collateral, uint256 minAmountOut, bytes4 swapSelector) = _tload();
        uint256 totalAmount = _swap(data.asset, collateral, data.debt, minAmountOut, swapSelector, data.swapData) +
            amount;

        IERC20(collateral).approve(address(market), totalAmount);
        market.supplyTo(data.user, collateral, totalAmount);
        market.withdrawFrom(data.user, address(this), data.asset, data.debt + data.fee);

        (bool done, ) = endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.repayFlashLoan.selector,
                data.flp,
                data.asset,
                data.debt + data.fee
            )
        );

        _catch(done);

        emit Executed(data.user, market, collateral, totalAmount, data.debt);
    }

    /**
     * @notice Executes the position withdrawal during flash loan callback
     * @param data Flash loan callback data containing loan details and user information
     * @param endpoint Address of the flash loan plugin for repayment
     * @dev Internal function that:
     *      1. Temporarily repays user's debt using flash loan
     *      2. Withdraws collateral from the unlocked position
     *      3. Swaps collateral to base asset
     *      4. Repays flash loan and returns any remaining tokens to user
     */
    function _withdraw(ICometFlashLoanPlugin.CallbackData memory data, address endpoint) private {
        (uint256 amount, IComet market, address collateral, uint256 minAmountOut, bytes4 swapSelector) = _tload();

        IERC20(data.asset).approve(address(market), data.debt);
        market.supplyTo(data.user, data.asset, data.debt);
        uint128 take = uint128(
            amount == type(uint256).max ? market.collateralBalanceOf(data.user, collateral) : amount
        );
        market.withdrawFrom(data.user, address(this), collateral, take);
        uint256 repaymentAmount = data.debt + data.fee;

        _swap(collateral, data.asset, take, minAmountOut, swapSelector, data.swapData);

        uint256 baseLeft = IERC20(data.asset).balanceOf(address(this));

        if (baseLeft < repaymentAmount) {
            revert InvalidAmountOut();
        }

        (bool done, ) = endpoint.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector, data.flp, data.asset, repaymentAmount)
        );

        _catch(done);

        baseLeft -= repaymentAmount;
        if (baseLeft > 0) IERC20(data.asset).safeTransfer(data.user, baseLeft);

        uint256 collateralLeft = IERC20(collateral).balanceOf(address(this));
        if (collateralLeft > 0) IERC20(collateral).safeTransfer(data.user, collateralLeft);

        emit Withdrawn(data.user, market, collateral, take, baseLeft);
    }

    /**
     * @notice Executes a token swap using the configured swap plugin
     * @param srcToken Address of the source token to swap from
     * @param dstToken Address of the destination token to swap to
     * @param amount Amount of source tokens to swap
     * @param minAmountOut Minimum amount of destination tokens expected
     * @param swapSelector Function selector of the swap plugin to use
     * @param swapData Encoded parameters for the swap execution
     * @return amountOut Actual amount of destination tokens received
     * @dev Uses delegatecall to execute swap in the context of this contract
     */
    function _swap(
        address srcToken,
        address dstToken,
        uint256 amount,
        uint256 minAmountOut,
        bytes4 swapSelector,
        bytes memory swapData
    ) internal returns (uint256 amountOut) {
        Plugin memory plugin = plugins[swapSelector];
        require(plugin.endpoint != address(0), InvalidPluginSelector());

        bytes memory callData = abi.encodeWithSelector(
            ICometSwapPlugin.executeSwap.selector,
            srcToken,
            dstToken,
            amount,
            minAmountOut,
            plugin.config,
            swapData
        );
        (bool ok, bytes memory data) = address(plugin.endpoint).delegatecall(callData);
        _catch(ok);

        amountOut = abi.decode(data, (uint256));

        require(amountOut >= minAmountOut, InvalidAmountOut());
    }

    /**
     * @notice Initiates a flash loan using the specified plugin
     * @param endpoint Address of the flash loan plugin
     * @param data Callback data to be passed to the flash loan callback
     * @param config Plugin-specific configuration data
     * @dev Uses delegatecall to execute the flash loan in this contract's context
     */
    function _loan(address endpoint, ICometFlashLoanPlugin.CallbackData memory data, bytes memory config) internal {
        (bool ok, ) = endpoint.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector, data, config)
        );
        _catch(ok);
    }

    /**
     * @notice Calculates the required loan amount for a given leverage ratio
     * @param comet The Comet market interface
     * @param collateral Address of the collateral token
     * @param collateralAmount Amount of collateral being supplied
     * @param leverage Leverage multiplier (e.g., 20000 = 2x)
     * @return Required loan amount in base asset terms
     * @dev Formula: loan = (initialValue * (leverage - 1)) / LEVERAGE_PRECISION
     */
    function _leveraged(
        IComet comet,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage
    ) internal view returns (uint256) {
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(collateral);
        uint256 price = comet.getPrice(info.priceFeed);

        uint256 initialValueBase = Math.mulDiv(
            Math.mulDiv(collateralAmount, price, 10 ** AggregatorV3Interface(info.priceFeed).decimals()),
            comet.baseScale(),
            info.scale
        );

        return Math.mulDiv(initialValueBase, leverage - LEVERAGE_PRECISION, LEVERAGE_PRECISION);
    }

    /**
     * @notice Converts between collateral and base asset amounts using market prices
     * @param comet The Comet market interface
     * @param collateral Address of the collateral token
     * @param collateralAmount Amount to convert
     * @return Converted amount in the target denomination
     * @dev Accounts for collateral factors and price feed decimals in conversions
     */
    function _convert(IComet comet, address collateral, uint256 collateralAmount) internal view returns (uint256) {
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(collateral);
        uint256 price = comet.getPrice(info.priceFeed);
        uint64 collateralFactor = info.borrowCollateralFactor;

        uint256 num = price * comet.baseScale() * uint256(collateralFactor);
        uint256 den = _scale(info.priceFeed, uint256(info.scale)) * 1e18;

        return Math.mulDiv(collateralAmount, num, den);
    }

    /**
     * @notice Calculates the scaling factor for price feed decimals
     * @param priceFeed Address of the Chainlink price feed
     * @param scale Token's native scaling factor
     * @return Combined scaling factor for price calculations
     * @dev Used to normalize prices across different decimal precisions
     */
    function _scale(address priceFeed, uint256 scale) internal view returns (uint256) {
        return 10 ** AggregatorV3Interface(priceFeed).decimals() * scale;
    }

    /**
     * @notice Stores operation parameters in transient storage for callback access
     * @param amount Collateral amount being processed
     * @param market Address of the Comet market
     * @param collateral Address of the collateral token
     * @param minAmountOut Minimum expected output amount
     * @param swapSelector Function selector for the swap plugin
     * @param mode Operation mode (EXECUTE or WITHDRAW)
     * @dev Uses EIP-1153 transient storage for gas-efficient temporary data storage
     */
    function _tstore(
        uint256 amount,
        address market,
        address collateral,
        uint256 minAmountOut,
        bytes4 swapSelector,
        Mode mode
    ) internal {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            tstore(slot, mode)
            tstore(add(slot, AMOUNT_OFFSET), amount)
            tstore(add(slot, MARKET_OFFSET), market)
            tstore(add(slot, COLLATERAL_OFFSET), collateral)
            tstore(add(slot, MIN_AMOUNT_OUT_OFFSET), minAmountOut)
            tstore(add(slot, SWAP_SELECTOR_OFFSET), swapSelector)
        }
    }

    /**
     * @notice Retrieves and clears operation parameters from transient storage
     * @return amount Collateral amount being processed
     * @return market Address of the Comet market
     * @return collateral Address of the collateral token
     * @return minAmountOut Minimum expected output amount
     * @return swapSelector Function selector for the swap plugin
     * @dev Automatically clears the storage slots after reading to prevent reuse
     */
    function _tload()
        internal
        returns (uint256 amount, IComet market, address collateral, uint256 minAmountOut, bytes4 swapSelector)
    {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            amount := tload(add(slot, AMOUNT_OFFSET))
            market := tload(add(slot, MARKET_OFFSET))
            collateral := tload(add(slot, COLLATERAL_OFFSET))
            minAmountOut := tload(add(slot, MIN_AMOUNT_OUT_OFFSET))
            swapSelector := tload(add(slot, SWAP_SELECTOR_OFFSET))
            tstore(add(slot, AMOUNT_OFFSET), 0)
            tstore(add(slot, MARKET_OFFSET), 0)
            tstore(add(slot, COLLATERAL_OFFSET), 0)
            tstore(add(slot, MIN_AMOUNT_OUT_OFFSET), 0)
            tstore(add(slot, SWAP_SELECTOR_OFFSET), 0)
        }
    }

    /**
     * @notice Handles failed external calls by reverting with the original error
     * @param success Boolean indicating if the external call succeeded
     * @dev Preserves the original revert reason when delegatecalls or external calls fail
     */
    function _catch(bool success) internal pure {
        if (!success) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }
    }
}
