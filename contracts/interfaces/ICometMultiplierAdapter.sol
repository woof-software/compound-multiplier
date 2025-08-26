// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.30;

interface ICometMultiplierAdapter {
    error UnsupportedAsset();
    error UnsupportedPriceFeed();
    error UnknownCallbackSelector();
    error InvalidPluginSelector();
    error InvalidLeverage();
    error CallbackFailed();
    error FlashLoanFailed();
    error InsufficiantAmountOut();

    struct Plugin {
        address endpoint;
        bytes config;
    }

    function executeMultiplier(
        address baseAsset, // Compound V3 market address
        address collateralAsset, // Token to use as collateral
        uint256 initialAmount, // User's initial collateral
        uint256 leverage, // Leverage in basis points
        bytes calldata swapData, // 1inch swap calldata. Optional, can be empty in case we swap assets using LST/LRT protocol
        uint256 minAmountOut // Slippage protection
    ) external;

    event AssetAdded(address indexed market, address indexed collateralAsset, bytes4 pluginSelector);

    event PluginAdded(address indexed plugin, bytes4 pluginSelector);
}
