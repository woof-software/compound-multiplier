// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IWEth } from "./external/weth/IWEth.sol";

import { CometFoundation } from "./CometFoundation.sol";
import { IComet } from "./external/compound/IComet.sol";
import { ICometMultiplier } from "./interfaces/ICometMultiplier.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";

/**
 * @title CometMultiplier
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice A leveraged position manager for Compound V3 (Comet) markets that enables users to
 *         create and unwind leveraged positions using flash loans and token swaps
 * @dev This contract uses a plugin architecture to support different flash loan providers and DEX aggregators.
 *      It leverages transient storage (EIP-1153) for gas-efficient temporary data storage during operations.
 */
contract CometMultiplier is CometFoundation, ReentrancyGuard, ICometMultiplier {
    using SafeERC20 for IERC20;

    /// @notice Offset constants for transient storage slots
    uint8 constant MIN_AMOUNT_OUT_OFFSET = 0xC0;

    /// @notice Wrapped ETH (WETH) token address
    address public immutable wEth;

    /**
     * @notice Initializes the CometMultiplier with plugins and WETH address
     * @param _plugins Array of plugin configurations containing endpoints and their callback selectors
     * @param _wEth Address of the WETH token contract for handling ETH wrapping/unwrapping
     * @dev Each plugin must have a valid non-zero callback selector
     */
    constructor(Plugin[] memory _plugins, address _wEth) payable CometFoundation(_plugins) {
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
        (Mode mode, address loanPlugin) = _tloadFirst();

        require(loanPlugin != address(0), UnknownPlugin());
        (bool ok, bytes memory payload) = loanPlugin.delegatecall(msg.data);
        _catch(ok);
        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));
        require(IERC20(data.asset).balanceOf(address(this)) >= data.snapshot + data.debt, InvalidAmountOut());

        if (mode == Mode.EXECUTE) {
            _execute(data, loanPlugin);
        } else if (mode == Mode.WITHDRAW) {
            _withdraw(data, loanPlugin);
        } else {
            revert InvalidMode();
        }

        assembly {
            mstore(0x00, 1)
            return(0x00, 0x20)
        }
    }

    /**
     * @inheritdoc ICometMultiplier
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
     * @inheritdoc ICometMultiplier
     */
    function executeMultiplierBySig(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut,
        AllowParams calldata allowParams
    ) external payable nonReentrant allow(opts.comet, allowParams) {
        _executeMultiplier(opts, collateral, collateralAmount, leverage, swapData, minAmountOut);
    }

    /**
     * @inheritdoc ICometMultiplier
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
     * @inheritdoc ICometMultiplier
     */
    function withdrawMultiplierBySig(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint256 minAmountOut,
        AllowParams calldata allowParams
    ) external nonReentrant allow(opts.comet, allowParams) {
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
        IComet comet = IComet(opts.comet);

        if (msg.value > 0) {
            require(collateral == wEth, InvalidAsset());
            collateralAmount = msg.value;
            IWEth(wEth).deposit{ value: msg.value }();
        } else {
            IERC20(collateral).safeTransferFrom(msg.sender, address(this), collateralAmount);
        }

        address baseAsset = comet.baseToken();

        _tstore(
            opts.loanPlugin,
            opts.swapPlugin,
            address(comet),
            collateral,
            collateralAmount,
            minAmountOut,
            Mode.EXECUTE
        );

        _loan(
            opts.loanPlugin,
            ICometFlashLoanPlugin.CallbackData({
                debt: _leveraged(comet, collateral, collateralAmount, leverage),
                fee: 0, // to be handled by plugin
                snapshot: IERC20(baseAsset).balanceOf(address(this)),
                user: msg.sender,
                flp: opts.flp,
                asset: baseAsset,
                swapData: swapData
            }),
            _validateLoan(opts)
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
        IComet comet = IComet(opts.comet);

        uint256 loanDebt;
        address baseAsset = comet.baseToken();
        uint256 repayAmount = comet.borrowBalanceOf(msg.sender);
        require(repayAmount > 0, NothingToDeleverage());
        if (collateralAmount == type(uint256).max) {
            loanDebt = repayAmount;
        } else {
            require(collateralAmount <= comet.collateralBalanceOf(msg.sender, collateral), InvalidCollateralAmount());
            loanDebt = Math.min(_convert(comet, collateral, collateralAmount), repayAmount);
        }

        require(loanDebt > 0, InvalidLeverage());

        _tstore(
            opts.loanPlugin,
            opts.swapPlugin,
            address(comet),
            collateral,
            collateralAmount,
            minAmountOut,
            Mode.WITHDRAW
        );

        _loan(
            opts.loanPlugin,
            ICometFlashLoanPlugin.CallbackData({
                debt: loanDebt,
                fee: 0, // to be handled by plugin
                snapshot: IERC20(baseAsset).balanceOf(address(this)),
                user: msg.sender,
                flp: opts.flp,
                asset: baseAsset,
                swapData: swapData
            }),
            _validateLoan(opts)
        );
    }

    /**
     * @notice Executes the leveraged position creation during flash loan callback
     * @param data Flash loan callback data containing loan details and user information
     * @param loanPlugin Address of the flash loan plugin for repayment
     * @dev Internal function that:
     *      1. Swaps borrowed base asset to collateral
     *      2. Supplies total collateral (original + swapped) to Comet
     *      3. Withdraws base asset from user's position to repay the flash loan
     */
    function _execute(ICometFlashLoanPlugin.CallbackData memory data, address loanPlugin) private {
        (address swapPlugin, uint256 amount, IComet comet, address collateral, uint256 minAmountOut) = _tloadSecond();
        uint256 totalAmount = _swap(swapPlugin, data.asset, collateral, data.debt, minAmountOut, data.swapData) +
            amount;

        uint256 repayAmount = data.debt + data.fee;
        IERC20(collateral).safeIncreaseAllowance(address(comet), totalAmount);
        comet.supplyTo(data.user, collateral, totalAmount);

        comet.withdrawFrom(data.user, address(this), data.asset, repayAmount);
        _repay(loanPlugin, data.flp, data.asset, repayAmount);

        emit Executed(data.user, address(comet), collateral, totalAmount, data.debt);
    }

    /**
     * @notice Executes the position withdrawal during flash loan callback
     * @param data Flash loan callback data containing loan details and user information
     * @param loanPlugin Address of the flash loan plugin for repayment
     * @dev Internal function that:
     *      1. Temporarily repays user's debt using flash loan
     *      2. Withdraws collateral from the unlocked position
     *      3. Swaps collateral to base asset
     *      4. Repays flash loan and returns any remaining tokens to user
     */
    function _withdraw(ICometFlashLoanPlugin.CallbackData memory data, address loanPlugin) private {
        (address swapPlugin, uint256 amount, IComet comet, address collateral, uint256 minAmountOut) = _tloadSecond();

        require(swapPlugin != address(0), UnknownPlugin());

        IERC20(data.asset).safeIncreaseAllowance(address(comet), data.debt);
        comet.supplyTo(data.user, data.asset, data.debt);
        uint128 take = uint128(amount == type(uint256).max ? comet.collateralBalanceOf(data.user, collateral) : amount);
        comet.withdrawFrom(data.user, address(this), collateral, take);
        uint256 repaymentAmount = data.debt + data.fee;

        require(_swap(swapPlugin, collateral, data.asset, take, minAmountOut, data.swapData) > 0, InvalidAmountOut());

        uint256 baseLeft = IERC20(data.asset).balanceOf(address(this));

        require(baseLeft >= repaymentAmount, InvalidAmountOut());
        _repay(loanPlugin, data.flp, data.asset, repaymentAmount);

        baseLeft -= repaymentAmount;
        if (baseLeft > 0) IERC20(data.asset).safeTransfer(data.user, baseLeft);

        uint256 collateralLeft = IERC20(collateral).balanceOf(address(this));
        if (collateralLeft > 0) IERC20(collateral).safeTransfer(data.user, collateralLeft);

        emit Withdrawn(data.user, address(comet), collateral, take, baseLeft);
    }

    /**
     * @notice Calculates the required loan amount for a given leverage ratio
     * @param comet The Comet comet interface
     * @param collateral Address of the collateral token
     * @param collateralAmount Amount of collateral being supplied
     * @param leverage Leverage multiplier (e.g., 20000 = 2x)
     * @return Required loan amount in base asset terms
     * @dev Formula: loan = (initialValue * (leverage - 1)) / PRECEISION
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

        return Math.mulDiv(initialValueBase, leverage - PRECEISION, PRECEISION);
    }

    /**
     * @notice Converts between collateral and base asset amounts using comet prices
     * @param comet The Comet comet interface
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
        uint256 den = _scale(info.priceFeed, uint256(info.scale)) * FACTOR_SCALE;

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
     * @param swapPlugin Address of the swap plugin
     * @param amount Collateral amount being processed
     * @param comet Address of the Comet comet
     * @param collateral Address of the collateral token
     * @param minAmountOut Minimum expected output amount
     * @param mode Operation mode (EXECUTE or WITHDRAW)
     * @dev Uses EIP-1153 transient storage for gas-efficient temporary data storage
     */
    function _tstore(
        address loanPlugin,
        address swapPlugin,
        address comet,
        address collateral,
        uint256 amount,
        uint256 minAmountOut,
        Mode mode
    ) internal {
        bytes32 slot = SLOT_FOUNDATION;
        assembly {
            tstore(slot, mode)
            tstore(add(slot, LOAN_PLUGIN_OFFSET), loanPlugin)
            tstore(add(slot, SWAP_PLUGIN_OFFSET), swapPlugin)
            tstore(add(slot, MARKET_OFFSET), comet)
            tstore(add(slot, ASSET_OFFSET), collateral)
            tstore(add(slot, AMOUNT_OFFSET), amount)
            tstore(add(slot, MIN_AMOUNT_OUT_OFFSET), minAmountOut)
        }
    }

    /**
     * @notice Retrieves and clears first operation parameters from transient storage
     * @return mode Operation mode (EXECUTE or WITHDRAW)
     * @return loanPlugin Address of the flashloan plugin
     * @dev Automatically clears the storage slots after reading to prevent reuse
     */
    function _tloadFirst() internal returns (Mode mode, address loanPlugin) {
        bytes32 slot = SLOT_FOUNDATION;
        assembly {
            mode := tload(slot)
            loanPlugin := tload(add(slot, LOAN_PLUGIN_OFFSET))
            tstore(slot, 0)
            tstore(add(slot, LOAN_PLUGIN_OFFSET), 0)
        }
    }

    /**
     * @notice Retrieves and clears second operation parameters from transient storage
     * @return swapPlugin Address of the swap plugin
     * @return amount Collateral amount being processed
     * @return comet Address of the Comet comet
     * @return collateral Address of the collateral token
     * @return minAmountOut Minimum expected output amount
     * @dev Automatically clears the storage slots after reading to prevent reuse
     */
    function _tloadSecond()
        internal
        returns (address swapPlugin, uint256 amount, IComet comet, address collateral, uint256 minAmountOut)
    {
        bytes32 slot = SLOT_FOUNDATION;
        assembly {
            swapPlugin := tload(add(slot, SWAP_PLUGIN_OFFSET))
            comet := tload(add(slot, MARKET_OFFSET))
            collateral := tload(add(slot, ASSET_OFFSET))
            amount := tload(add(slot, AMOUNT_OFFSET))
            minAmountOut := tload(add(slot, MIN_AMOUNT_OUT_OFFSET))
            tstore(add(slot, SWAP_PLUGIN_OFFSET), 0)
            tstore(add(slot, MARKET_OFFSET), 0)
            tstore(add(slot, ASSET_OFFSET), 0)
            tstore(add(slot, AMOUNT_OFFSET), 0)
            tstore(add(slot, MIN_AMOUNT_OUT_OFFSET), 0)
        }
    }
}
