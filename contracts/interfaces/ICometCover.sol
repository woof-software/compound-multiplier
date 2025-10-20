// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { ICometStructs as ICS } from "./ICometStructs.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICometCover
 * @notice Interface for CompoundV3 collateral position cover contract
 */
interface ICometCover {
    /**
     * @notice Reduces or closes a leveraged position by withdrawing collateral and repaying debt
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to withdraw
     * @param collateralAmount Amount of collateral tokens to withdraw (or type(uint256).max for maximum)
     * @param swapData Encoded swap parameters for converting collateral to base asset
     * @dev This function:
     * 1. Checks that the user has an outstanding borrow balance
     * 2. Calculates the maximum withdrawable amount based on collateralization
     * 3. Initiates a flash loan to temporarily repay debt and withdraw collateral
     * @custom:security Protected by reentrancy guard and validates borrow balance exists
     */
    function cover(
        ICS.Options memory opts,
        IERC20 collateral,
        uint256 collateralAmount,
        bytes calldata swapData
    ) external;

    /**
     * @notice Reduces or closes a leveraged position with EIP-712 signature authorization
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to withdraw
     * @param collateralAmount Amount of collateral tokens to withdraw (or type(uint256).max for maximum)
     * @param swapData Encoded swap parameters for converting collateral to base asset
     * @param allowParams EIP-712 signature parameters for Comet authorization
     * @dev This function first authorizes the adapter via allowBySig, then withdraws the position
     * @custom:security Signature must be valid and not expired; protected by reentrancy guard
     */
    function cover(
        ICS.Options memory opts,
        IERC20 collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external;
}
