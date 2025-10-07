// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.30;

import { ICometExt } from "./ICometExt.sol";

/**
 * @title Compound's Comet Main Interface (without Ext)
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
interface IComet is ICometExt {
    struct AssetInfo {
        uint8 offset;
        address asset;
        address priceFeed;
        uint64 scale;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint128 supplyCap;
    }

    struct UserCollateral {
        uint128 balance;
        uint128 _reserved;
    }

    error Unauthorized();

    function supply(address asset, uint amount) external;

    function supplyTo(address dst, address asset, uint amount) external;

    function withdraw(address asset, uint amount) external;

    function withdrawFrom(address src, address to, address asset, uint amount) external;

    function getAssetInfoByAddress(address asset) external view returns (AssetInfo memory);

    function getPrice(address priceFeed) external view returns (uint);

    function borrowBalanceOf(address account) external view returns (uint256);

    function collateralBalanceOf(address account, address asset) external view returns (uint128);

    function baseToken() external view returns (address);

    function baseScale() external view returns (uint);

    function decimals() external view returns (uint8);

    function hasPermission(address owner, address manager) external view returns (bool);

    function userCollateral(address user, address asset) external view returns (UserCollateral memory);
}
