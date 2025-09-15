// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ICometSwapPlugin {
    event SwapExecuted(
        address indexed router,
        address indexed srcToken,
        address indexed dstToken,
        uint256 actualAmountOut
    );

    error InvalidAmountOut();
    error InvalidInput();
    error ZeroAddress();
    error InvalidSwapParameters();
    error SwapFailed();

    function CALLBACK_SELECTOR() external view returns (bytes4);

    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut);
}
