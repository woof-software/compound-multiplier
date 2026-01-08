// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.30;

import { ICometStructs as ICS } from "./ICometStructs.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICometAdjust
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Interface for adjusting leverage on existing positions without closing them
 * @dev Allows users to increase or decrease their position leverage atomically
 */
interface ICometAdjust {
    /**
     * @notice Adjusts the leverage of an existing position by a specific debt delta
     * @param opts Configuration options including market and plugin addresses
     * @param collateral Address of the collateral token in the position
     * @param debtDelta The amount to change debt by (always positive)
     * @param isIncrease True to increase leverage (borrow more), false to decrease (repay debt)
     * @param maxSlippageBps Maximum allowed slippage in basis points (10000 = 100%)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @dev Operations:
     *      - If isIncrease=true: Leverage UP (flash loan base → swap to collateral → supply → borrow to repay)
     *      - If isIncrease=false: Leverage DOWN (flash loan base → repay debt → withdraw collateral → swap to base → repay flash loan)
     * @custom:security Protected by reentrancy guard and requires valid plugin selectors
     */
    function adjust(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 debtDelta,
        bool isIncrease,
        uint16 maxSlippageBps,
        bytes calldata swapData
    ) external;

    /**
     * @notice Adjusts the leverage of an existing position with EIP-712 signature authorization
     * @param opts Configuration options including market and plugin addresses
     * @param collateral Address of the collateral token in the position
     * @param debtDelta The amount to change debt by (always positive)
     * @param isIncrease True to increase leverage (borrow more), false to decrease (repay debt)
     * @param maxSlippageBps Maximum allowed slippage in basis points (10000 = 100%)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @param allowParams EIP-712 signature parameters for Comet authorization
     * @dev This function first authorizes the adapter via allowBySig, then executes the adjustment
     * @custom:security Signature must be valid and not expired; protected by reentrancy guard
     */
    function adjust(
        ICS.Options calldata opts,
        IERC20 collateral,
        uint256 debtDelta,
        bool isIncrease,
        uint16 maxSlippageBps,
        bytes calldata swapData,
        ICS.AllowParams calldata allowParams
    ) external;
}
