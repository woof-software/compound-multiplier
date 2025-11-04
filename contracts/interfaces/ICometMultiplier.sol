// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.30;

import { ICometStructs as ICS } from "./ICometStructs.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICometMultiplier {
    /**
     * @notice Creates a leveraged position by borrowing against supplied collateral
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to supply
     * @param collateralAmount Amount of collateral tokens to supply
     * @param baseAmount Amount of base asset to borrow for leverage
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @dev This function:
     * 1. Validates the flash loan plugin exists
     * 2. Calculates the required loan amount based on leverage
     * 3. Transfers user's collateral to the contract
     * 4. Initiates a flash loan to execute the leveraged position
     * @custom:security Protected by reentrancy guard and requires valid plugin selectors
     */
    function multiply(
        ICS.Options memory opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        bytes calldata swapData
    ) external payable;

    /**
     * @notice Creates a leveraged position with EIP-712 signature authorization
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to supply
     * @param collateralAmount Amount of collateral tokens to supply
     * @param baseAmount Amount of base asset to borrow for leverage
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @param allowParams EIP-712 signature parameters for Comet authorization
     * @dev This function first authorizes the adapter via allowBySig, then executes the position
     * @custom:security Signature must be valid and not expired; protected by reentrancy guard
     */
    function multiply(
        ICS.Options memory opts,
        IERC20 collateral,
        uint256 collateralAmount,
        uint256 baseAmount,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external payable;
}
