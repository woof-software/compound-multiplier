// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IAllowBySig } from "./IAllowBySig.sol";
import { ICometFoundation } from "./ICometFoundation.sol";

/**
 * @title ICometCollateralSwap
 * @notice Interface for CompoundV3 collateral swap contract
 * @dev This contract enables users to swap one collateral asset for another within their Compound V3 position
 *      using flash loans. The swap maintains the user's debt position while changing their collateral composition.
 */
interface ICometCollateralSwap is ICometFoundation {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Parameters required to execute a collateral swap
     * @dev Contains all necessary information for the swap including assets, amounts, slippage protection, and swap routing
     * @param comet The address of the Compound V3 Comet contract for this market
     * @param flp The address of the flash loan provider contract to use for borrowing the target asset
     * @param fromAsset The address of the collateral asset to swap from (must be a valid Comet collateral)
     * @param toAsset The address of the collateral asset to swap to (must be a valid Comet collateral)
     * @param fromAmount The amount of fromAsset to swap (must be <= user's collateral balance)
     * @param minAmountOut The minimum amount of toAsset expected from the swap (slippage protection)
     * @param maxHealthFactorDropBps Maximum allowed drop in health factor in basis points (10000 = 100%)
     * @param callbackSelector The bytes4 selector identifying which flash loan plugin to use
     * @param swapCalldata The encoded calldata for the swap router to execute the asset exchange
     */
    struct SwapParams {
        Options opts;
        address fromAsset;
        address toAsset;
        uint256 fromAmount;
        uint256 minAmountOut;
        uint256 maxHealthFactorDropBps;
        bytes swapCalldata;
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Thrown when the swap would result in insufficient collateralization
     * @dev The health factor check fails, meaning the swap would make the position too risky
     */
    error NotSufficientLiquidity();

    /**
     * @notice Thrown when the actual swap output is less than the minimum required
     * @dev Slippage protection - the swap didn't produce enough of the target asset
     */
    error InsufficientAmountOut();

    /**
     * @notice Thrown when SwapParams contain invalid values
     * @dev Covers cases like zero addresses, zero amounts, or invalid health factor parameters
     */
    error InvalidSwapParameters();

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a collateral swap using flash loans
     * @dev The main entry point for swapping collateral assets in a Compound V3 position.
     *      This function:
     *      1. Validates swap parameters and health factor impact
     *      2. Initiates a flash loan for the target asset amount
     *      3. Supplies the borrowed asset to increase collateral
     *      4. Withdraws the original collateral to be swapped
     *      5. Swaps the withdrawn asset for the borrowed asset
     *      6. Repays the flash loan plus any fees
     *      7. Supplies any remaining dust back to the user's position
     *
     * @param swapParams The complete parameter struct defining the swap operation
     *
     * Requirements:
     * - Caller must have sufficient collateral balance of fromAsset
     * - Caller must have granted allowance to this contract on the Comet
     * - The swap must not violate health factor constraints
     * - The callbackSelector must correspond to a registered plugin
     * - The swap must produce enough toAsset to repay the flash loan plus fees
     *
     * @custom:security Validates collateralization before executing swap
     * @custom:security Uses registered plugins only to prevent malicious callbacks
     * @custom:security Validates exact token balance requirements throughout execution
     */
    function executeSwap(SwapParams calldata swapParams) external;

    /**
     * @notice Executes a collateral swap with signature-based authorization in a single transaction
     * @dev Combines Comet authorization via EIP-712 signature with collateral swap execution.
     *      This allows users to authorize the contract and execute a swap atomically,
     *      eliminating the need for a separate approve transaction.
     *
     *      The function first validates and applies the signature-based authorization,
     *      then proceeds with the same swap logic as the regular swap function.
     *
     * @param swapParams The complete parameter struct defining the swap operation
     * @param allowParams The EIP-712 signature parameters for Comet authorization
     *
     * Requirements:
     * - All requirements from swap() function
     * - allowParams.owner must equal msg.sender
     * - allowParams.manager must equal this contract address
     * - allowParams.isAllowed must be true
     * - The signature must be valid and not expired
     * - The nonce must match the user's current nonce in Comet
     *
     * @custom:security Validates signature authorization before swap execution
     * @custom:security Prevents replay attacks using nonce validation
     * @custom:security Ensures only the signer can use their own signature
     */
    function executeSwapBySig(SwapParams calldata swapParams, IAllowBySig.AllowParams calldata allowParams) external;
}
