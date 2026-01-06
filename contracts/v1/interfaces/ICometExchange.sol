// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { ICometStructs as ICS } from "./ICometStructs.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICometExchange
 * @notice Interface for CompoundV3 collateral swap contract
 * @dev This contract enables users to swap one collateral asset for another within their Compound V3 position
 *      using flash loans. The swap maintains the user's debt position while changing their collateral composition.
 */
interface ICometExchange {
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
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param fromAsset The address of the collateral asset to swap from (must be a valid Comet collateral)
     * @param toAsset The address of the collateral asset to swap to (must be a valid Comet collateral)
     * @param fromAmount The amount of fromAsset to swap (must be <= user's collateral balance)
     * @param minAmountOut The minimum amount of toAsset expected from the swap (slippage protection)
     * @param maxHealthFactorDrop Maximum allowed drop in health factor in basis points (10000 = 100%)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @custom:security Protected by reentrancy guard and validates health factor impact
     */

    function exchange(
        ICS.Options calldata opts,
        IERC20 fromAsset,
        IERC20 toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData
    ) external;

    /**
     * @notice Executes a collateral swap with signature-based authorization in a single transaction
     * @dev Combines Comet authorization via EIP-712 signature with collateral swap execution.
     *      This allows users to authorize the contract and execute a swap atomically,
     *      eliminating the need for a separate approve transaction.
     *
     *      The function first validates and applies the signature-based authorization,
     *      then proceeds with the same swap logic as the regular swap function.
     *
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param fromAsset The address of the collateral asset to swap from (must be a valid Comet collateral)
     * @param toAsset The address of the collateral asset to swap to (must be a valid Comet collateral)
     * @param fromAmount The amount of fromAsset to swap (must be <= user's collateral balance)
     * @param minAmountOut The minimum amount of toAsset expected from the swap (slippage protection)
     * @param maxHealthFactorDrop Maximum allowed drop in health factor in basis points (10000 = 100%)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @param allowParams EIP-712 signature parameters for Comet authorization
     * @custom:security Signature must be valid and not expired; protected by reentrancy guard
     */
    function exchange(
        ICS.Options calldata opts,
        IERC20 fromAsset,
        IERC20 toAsset,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external;
}
