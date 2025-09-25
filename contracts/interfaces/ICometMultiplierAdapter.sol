// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.30;

interface ICometMultiplierAdapter {
    error UnsupportedPriceFeed();
    error UnknownCallbackSelector();
    error UnknownMarket();
    error InvalidPluginSelector();
    error InvalidLeverage();
    error InvalidAmountOut();
    error InvalidAsset();
    error CallbackFailed();
    error FlashLoanFailed();
    error InvalidMode();
    error AlreadyExists();
    error NothingToDeleverage();
    error InvalidCollateralAmount();

    enum Mode {
        EXECUTE,
        WITHDRAW
    }

    struct Plugin {
        address endpoint;
        bytes config;
    }

    struct Options {
        address market;
        address flp;
        bytes4 loanSelector;
        bytes4 swapSelector;
    }

    event AssetAdded(address indexed collateralAsset, bytes4 pluginSelector);
    event PluginAdded(address indexed plugin, bytes4 pluginSelector);

    event Executed(
        address indexed user,
        address indexed market,
        address indexed collateral,
        uint256 totalAmount,
        uint256 debtAmount
    );

    event Withdrawn(
        address indexed user,
        address indexed market,
        address indexed collateral,
        uint256 withdrawnAmount,
        uint256 baseReturned
    );

    function wEth() external view returns (address);
}
