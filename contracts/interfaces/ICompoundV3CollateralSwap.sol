// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ICompoundV3CollateralSwap {
    struct Plugin {
        address endpoint;
        address flp;
    }

    struct SwapParams {
        address user;
        address comet;
        bytes4 callbackSelector;
        address fromAsset;
        uint256 fromAmount;
        address toAsset;
        bytes swapCalldata;
        uint256 minAmountOut;
        uint256 maxHealthFactorDropBps;
    }

    event PluginRegistered(bytes4 indexed callbackSelector, address indexed pluginEndpoint, address indexed flp);

    error UnauthorizedCallback();
    error ZeroAddress();
    error UnknownPlugin();
    error NotSufficientLiquidity();
    error UnknownCallbackSelector();
    error FlashLoanFailed();
    error InsufficientAmountOut();
    error InvalidAmountOut();

    function swapRouter() external view returns (address);

    function swap(SwapParams calldata swapParams) external;
}
