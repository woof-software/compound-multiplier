// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.30;

import { ICometStructs as ICS } from "./ICometStructs.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICometAdjust
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Interface for increasing leverage on existing positions without adding capital
 * @dev Allows users to atomically increase position leverage using existing equity
 */
interface ICometAdjust {
    /**
     * @notice Increases the leverage of an existing position by borrowing additional debt
     * @param opts Configuration options including market and plugin addresses
     * @param collateral Address of the collateral token in the position
     * @param additionalDebt The additional amount of base asset to borrow
     * @param maxHealthFactorDrop Maximum allowed health factor drop in basis points (10000 = 100%)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @dev Flow: flash loan base → swap to collateral → supply collateral → borrow to repay flash loan
     *      To decrease leverage, users should use cover() or repay debt directly via comet.supply()
     * @custom:security Protected by reentrancy guard and requires valid plugin selectors
     */
    function adjust(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 additionalDebt,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData
    ) external;

    /**
     * @notice Increases leverage with EIP-712 signature authorization
     * @param opts Configuration options including market and plugin addresses
     * @param collateral Address of the collateral token in the position
     * @param additionalDebt The additional amount of base asset to borrow
     * @param maxHealthFactorDrop Maximum allowed health factor drop in basis points (10000 = 100%)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @param allowParams EIP-712 signature parameters for Comet authorization
     * @dev This function first authorizes the adapter via allowBySig, then executes the adjustment
     * @custom:security Signature must be valid and not expired; protected by reentrancy guard
     */
    function adjust(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 additionalDebt,
        uint256 maxHealthFactorDrop,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external;
}
