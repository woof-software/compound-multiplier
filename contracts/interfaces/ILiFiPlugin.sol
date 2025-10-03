// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ILiFiPlugin {
    event SwapExecuted(
        address indexed router,
        address indexed srcToken,
        address indexed dstToken,
        uint256 actualAmountOut
    );

    error SwapFailed();
    error InsufficientOutputAmount();
    error ZeroAddress();
    error InvalidSwapParameters();

    function executeSwap(
        address router,
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external;
}
