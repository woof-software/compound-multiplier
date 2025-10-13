// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ICometSwapPlugin is IERC165 {
    error InvalidAmountOut();
    error InvalidInput();
    error ZeroAddress();
    error InvalidSwapParameters();
    error SwapFailed();

    /**
     * @notice Emitted when a token swap is successfully executed
     * @param router The address of the router or contract used to perform the swap
     * @param srcToken Address of the source token swapped from
     * @param dstToken Address of the destination token swapped to
     * @param amountOut The actual amount of destination tokens received from the swap
     */
    event SwapExecuted(address indexed router, address indexed srcToken, address indexed dstToken, uint256 amountOut);

    /**
     * @notice Executes a token swap between two assets
     * @param srcToken Address of the source token to swap from
     * @param dstToken Address of the destination token to swap to
     * @param amountIn Amount of source tokens to swap
     * @param minAmountOut Minimum amount of destination tokens expected
     * @param config Encoded configuration specific to the swap plugin
     * @param swapData Encoded data required by the underlying swap mechanism
     * @return amountOut Actual amount of destination tokens received from the swap
     */
    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut);
}
