// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.30;

interface ICometMultiplierAdapter {
    error UnsupportedAsset();
    error UnsupportedPriceFeed();
    error UnknownCallbackSelector();
    error UnknownSwapPlugin();
    error UnknownMarket();
    error InvalidPluginSelector();
    error InvalidLeverage();
    error InvalidAmountOut();
    error CallbackFailed();
    error FlashLoanFailed();
    error InvalidMode();
    error AlreadyExists();
    error NothingToDeleverage();

    enum Mode {
        EXECUTE,
        WITHDRAW
    }

    struct Market {
        address market;
        Asset baseAsset;
        Collateral[] collaterals;
    }

    struct Collateral {
        address asset;
        Asset config;
        uint256 leverage;
    }

    struct Plugin {
        address endpoint;
        bytes config;
    }

    struct Asset {
        address flp;
        bytes4 loanSelector;
        bytes4 swapSelector;
    }

    function executeMultiplier(
        address market,
        address collateralAsset,
        uint256 initialAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external;

    event AssetAdded(address indexed collateralAsset, bytes4 pluginSelector);

    event PluginAdded(address indexed plugin, bytes4 pluginSelector);
}
