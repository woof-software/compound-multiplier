// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { CometFoundation } from "./CometFoundation.sol";
import { IComet } from "./external/compound/IComet.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { ICometCollateralSwap } from "./interfaces/ICometCollateralSwap.sol";
import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";
import { IAllowBySig } from "./interfaces/IAllowBySig.sol";

/**
 * @title CometCollateralSwap
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 *
 * @dev This contract allows users to swap one type of collateral for another in their Compound V3 position
 *      without needing to close their borrowing position. The process works by:
 *      1. Taking a flash loan of the desired collateral asset
 *      2. Supplying the flash loan to the user's Compound position
 *      3. Withdrawing the user's existing collateral
 *      4. Swapping the withdrawn collateral for the borrowed asset to repay the flash loan
 *      5. Supplying any remaining dust back to the user's position
 *
 *      The contract supports multiple flash loan providers through a modular plugin system and
 *      uses configurable swap plugins for executing the collateral swap.
 * @dev Features:
 *      - Multi-protocol flash loan support
 *      - Modular swap execution through dedicated swap plugins
 *      - Health factor validation to ensure position remains safe after swap
 *      - Gas-optimized execution using delegate calls and transient storage
 *      - Signature-based approvals for gasless transactions
 *      - Comprehensive slippage protection and validation
 * @dev Security Features:
 *      - Callback validation ensures only registered plugins can execute operations
 *      - Health factor checks prevent unsafe position modifications
 *      - Exact balance validation before and after operations
 *      - Transient storage prevents storage slot collisions
 *      - Comprehensive input validation and error handling
 * @dev Architecture:
 *      - Uses fallback() function as a universal callback handler for flash loan providers
 *      - Employs plugin pattern for extensibility and protocol abstraction
 *      - Integrates with allowBySig for meta-transaction support
 *      - Optimized for gas efficiency through minimal storage usage
 * @custom:security-considerations
 *      - Users must have sufficient collateral to maintain healthy positions after swaps
 *      - Flash loan fees are automatically accounted for in minimum output calculations
 *      - Slippage protection is enforced through minAmountOut parameter validation
 *      - Only registered and validated plugins can execute flash loans and swaps
 *      - Plugins are configured exclusively during contract deployment. To add or modify plugins,
 *        redeployment of the contract is required.
 */
contract CometCollateralSwap is CometFoundation, ICometCollateralSwap {
    using SafeERC20 for IERC20;

    constructor(Plugin[] memory _plugins) payable CometFoundation(_plugins) {}

    /**
     * @notice Handles flash loan callbacks from registered plugins to execute collateral swaps
     * @dev This fallback function is the core of the collateral swap mechanism. It receives callbacks
     *      from flash loan providers through registered plugins and executes a complete collateral swap:
     *      1. Validates the callback is from an authorized source
     *      2. Decodes the callback data and retrieves swap parameters
     *      3. Supplies the borrowed asset to Comet on behalf of the user
     *      4. Withdraws the user's collateral to be swapped
     *      5. Swaps the withdrawn collateral for the borrowed asset to repay the loan
     *      6. Supplies any remaining dust amounts back to the user
     *      7. Repays the flash loan with fees
     *
     * The function uses delegate calls to plugin endpoints for modularity and gas efficiency.
     * Temporary storage (tstore/tload) is used to pass swap parameters between function calls.
     *
     * @custom:security This function validates the caller is an authorized flash loan provider
     * @custom:security Uses tstore/tload for temporary parameter storage to avoid storage slot collisions
     * @custom:security Validates exact token balance requirements before and after operations
     * @custom:returns Returns uint256(1) to signal successful completion (required by some flash loan providers like AAVE)
     *
     * Requirements:
     * - msg.sig must correspond to a registered plugin callback selector
     * - msg.sender must be the registered flash loan provider for the callback selector
     * - The contract must receive exactly the expected amount of borrowed tokens
     * - The swap must produce enough tokens to repay the flash loan plus fees
     * - All delegate calls to plugins must succeed
     *
     * Reverts:
     * - UnknownPlugin: If the callback selector or sender is not recognized
     * - InvalidAmountOut: If token balances don't match expectations after operations
     * - May revert with plugin-specific errors if delegate calls fail
     */
    fallback() external {
        (address loanPlugin, address swapPlugin, IComet comet, address fromAsset, uint256 fromAmount) = _tload();

        require(loanPlugin != address(0) && swapPlugin != address(0), UnknownPlugin());

        (bool success, bytes memory payload) = loanPlugin.delegatecall(msg.data);
        _catch(success);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));
        IERC20 asset = IERC20(data.asset);
        address user = data.user;
        uint256 debt = data.debt;

        require(asset.balanceOf(address(this)) == data.snapshot + debt, InvalidAmountOut());

        asset.safeIncreaseAllowance(address(comet), debt);
        comet.supplyTo(user, address(asset), debt);
        comet.withdrawFrom(user, address(this), fromAsset, fromAmount);

        uint256 repayAmount = debt + data.fee;

        _swap(swapPlugin, fromAsset, data.asset, fromAmount, repayAmount, data.swapData);

        _supplyDust(user, IERC20(fromAsset), comet, 0);
        _supplyDust(user, asset, comet, repayAmount);

        _repay(loanPlugin, data.flp, data.asset, repayAmount);

        // Note Return 1 to the caller to signal success (required by AAVE)
        assembly {
            mstore(0x00, 1)
            return(0x00, 0x20)
        }
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICometCollateralSwap
    function executeSwap(SwapParams calldata swapParams) external {
        _executeSwap(swapParams);
    }

    /// @inheritdoc ICometCollateralSwap
    function executeSwapBySig(
        SwapParams calldata swapParams,
        AllowParams calldata allowParams
    ) external allow(swapParams.opts.comet, allowParams) {
        _executeSwap(swapParams);
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

    function _executeSwap(SwapParams calldata swapParams) internal {
        bytes memory config = _validateSwap(swapParams.opts.swapPlugin);

        address loanPlugin = swapParams.opts.loanPlugin;
        address swapPlugin = swapParams.opts.swapPlugin;
        address comet = swapParams.opts.comet;
        address toAsset = swapParams.toAsset;
        address fromAsset = swapParams.fromAsset;
        uint256 minAmountOut = swapParams.minAmountOut;
        uint256 fromAmount = swapParams.fromAmount;

        _validateExecParams(swapParams);

        require(
            _checkCollateralization(
                IComet(comet),
                fromAsset,
                toAsset,
                fromAmount,
                minAmountOut,
                swapParams.maxHealthFactorDropBps
            ),
            NotSufficientLiquidity()
        );

        _tstore(loanPlugin, swapPlugin, comet, fromAsset, fromAmount);

        _loan(
            loanPlugin,
            ICometFlashLoanPlugin.CallbackData({
                debt: minAmountOut,
                fee: 0, // to be handled by plugin
                snapshot: IERC20(toAsset).balanceOf(address(this)),
                user: msg.sender,
                flp: swapParams.opts.flp,
                asset: toAsset,
                swapData: swapParams.swapCalldata
            }),
            config
        );
    }

    /**
     * @dev Checks if the collateralization is sufficient for the swap.
     * @param comet The Comet contract instance.
     * @param assetFrom The address of the asset being swapped from.
     * @param assetTo The address of the asset being swapped to.
     * @param fromAmount The amount of the asset being swapped from.
     * @param minAmountOut The minimum amount of the asset being swapped to.
     * @param maxHealthFactorDropBps The maximum allowed drop in health factor (in basis points).
     *
     * @dev Liquidity is calculated based on comet implementation.
     * Implementation: https://github.com/compound-finance/comet/blob/main/contracts/Comet.sol#L544-L553
     */
    function _checkCollateralization(
        IComet comet,
        address assetFrom,
        address assetTo,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDropBps
    ) internal view returns (bool) {
        IComet.AssetInfo memory assetInfoFrom = comet.getAssetInfoByAddress(assetFrom);
        IComet.AssetInfo memory assetInfoTo = comet.getAssetInfoByAddress(assetTo);

        uint256 assetFromLiquidity = Math.mulDiv(
            Math.mulDiv(fromAmount, comet.getPrice(assetInfoFrom.priceFeed), assetInfoFrom.scale),
            assetInfoFrom.borrowCollateralFactor,
            FACTOR_SCALE
        );

        uint256 assetInLiquidity = Math.mulDiv(
            Math.mulDiv(minAmountOut, comet.getPrice(assetInfoTo.priceFeed), assetInfoTo.scale),
            assetInfoTo.borrowCollateralFactor,
            FACTOR_SCALE
        );

        return Math.mulDiv(assetFromLiquidity, (PRECEISION - maxHealthFactorDropBps), PRECEISION) < assetInLiquidity;
    }

    /**
     * @notice Stores operation parameters in transient storage for callback access
     * @param loanPlugin Address of the flash loan plugin
     * @param swapPlugin Address of the swap plugin
     * @param comet Address of the Comet comet
     * @param collateral Address of the collateral token
     * @param amount Collateral amount being processed
     * @dev Uses EIP-1153 transient storage for gas-efficient temporary data storage
     */
    function _tstore(
        address loanPlugin,
        address swapPlugin,
        address comet,
        address collateral,
        uint256 amount
    ) internal {
        bytes32 slot = SLOT_FOUNDATION;
        assembly {
            tstore(add(slot, LOAN_PLUGIN_OFFSET), loanPlugin)
            tstore(add(slot, SWAP_PLUGIN_OFFSET), swapPlugin)
            tstore(add(slot, MARKET_OFFSET), comet)
            tstore(add(slot, ASSET_OFFSET), collateral)
            tstore(add(slot, AMOUNT_OFFSET), amount)
        }
    }

    /**
     * @dev Loads and clears swap parameters from transient storage
     * @return loanPlugin The flash loan plugin address
     * @return swapPlugin The swap plugin address
     * @return comet The Comet contract address
     * @return fromAsset The asset being swapped from
     * @return fromAmount The amount being swapped
     */
    function _tload()
        internal
        returns (address loanPlugin, address swapPlugin, IComet comet, address fromAsset, uint256 fromAmount)
    {
        bytes32 slot = SLOT_FOUNDATION;
        assembly {
            loanPlugin := tload(add(slot, LOAN_PLUGIN_OFFSET))
            swapPlugin := tload(add(slot, SWAP_PLUGIN_OFFSET))
            comet := tload(add(slot, MARKET_OFFSET))
            fromAsset := tload(add(slot, ASSET_OFFSET))
            fromAmount := tload(add(slot, AMOUNT_OFFSET))
            tstore(add(slot, LOAN_PLUGIN_OFFSET), 0)
            tstore(add(slot, SWAP_PLUGIN_OFFSET), 0)
            tstore(add(slot, MARKET_OFFSET), 0)
            tstore(add(slot, ASSET_OFFSET), 0)
            tstore(add(slot, AMOUNT_OFFSET), 0)
        }
    }

    /**
     * @dev Validates swap parameters for correctness and safety
     * @param swapParams The swap parameters to validate
     */
    function _validateExecParams(SwapParams calldata swapParams) internal pure {
        require(
            swapParams.fromAsset != address(0) &&
                swapParams.toAsset != address(0) &&
                swapParams.minAmountOut > 0 &&
                swapParams.maxHealthFactorDropBps < PRECEISION,
            InvalidSwapParameters()
        );
    }

    /**
     * @dev Supplies any remaining asset balance back to user's Comet position
     * @param user The user to supply dust to
     * @param asset The asset to supply
     * @param comet The Comet contract address
     * @param repayAmount Amount reserved for repayment (excluded from dust)
     */
    function _supplyDust(address user, IERC20 asset, IComet comet, uint256 repayAmount) internal {
        uint256 balance = asset.balanceOf(address(this)) - repayAmount;
        if (balance != 0) {
            asset.safeIncreaseAllowance(address(comet), balance);
            comet.supplyTo(user, address(asset), balance);
        }
    }
}
