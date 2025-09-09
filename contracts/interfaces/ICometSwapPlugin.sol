// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ICometSwapPlugin {
    error InvalidAmountOut();
    error IvaildInput();

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
