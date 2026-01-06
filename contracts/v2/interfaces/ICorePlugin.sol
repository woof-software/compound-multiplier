// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICorePlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Interface for core lending protocol plugins used in V2 Foundation
 * @dev Abstracts lending protocol operations (supply, withdraw, borrow) to support multiple protocols like Compound, Morpho, Aave
 *
 * The `marketData` parameter is protocol-specific encoded data:
 * - Compound: abi.encode(cometAddress)
 * - Morpho: abi.encode(morphoAddress, MarketParams)
 */
interface ICorePlugin is IERC165 {
    /**
     * @notice Information about a collateral asset in the lending protocol
     * @param asset The address of the collateral asset
     * @param priceFeed The address of the price feed for the asset
     * @param scale The scale factor for the asset (10^decimals)
     * @param borrowCollateralFactor The factor used to calculate borrowing power (scaled by 1e18)
     * @param liquidateCollateralFactor The factor used to calculate liquidation threshold (scaled by 1e18)
     */
    struct AssetInfo {
        address asset;
        address priceFeed;
        uint64 scale;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
    }

    /**
     * @notice Returns the unique selector for the core plugin
     * @return The bytes4 selector identifying this core plugin type
     */
    function CORE_SELECTOR() external view returns (bytes4);

    /**
     * @notice Returns the base/debt token of the lending market
     * @param marketData Protocol-specific encoded market data
     * @return The base token address
     */
    function baseToken(bytes calldata marketData) external view returns (IERC20);

    /**
     * @notice Returns the scale factor for the base token
     * @param marketData Protocol-specific encoded market data
     * @return The base token scale (10^decimals)
     */
    function baseScale(bytes calldata marketData) external view returns (uint256);

    /**
     * @notice Returns the borrow balance of an account in the market
     * @param marketData Protocol-specific encoded market data
     * @param account The address of the account to check
     * @return The borrow balance amount
     */
    function borrowBalanceOf(bytes calldata marketData, address account) external view returns (uint256);

    /**
     * @notice Returns the collateral balance of an account for a specific asset
     * @param marketData Protocol-specific encoded market data
     * @param account The address of the account to check
     * @param asset The address of the collateral asset
     * @return The collateral balance amount
     */
    function collateralBalanceOf(
        bytes calldata marketData,
        address account,
        IERC20 asset
    ) external view returns (uint256);

    /**
     * @notice Returns asset information for a given collateral asset
     * @param marketData Protocol-specific encoded market data
     * @param asset The address of the collateral asset
     * @return info The asset information struct
     */
    function getAssetInfo(bytes calldata marketData, IERC20 asset) external view returns (AssetInfo memory info);

    /**
     * @notice Returns the price of an asset from its price feed
     * @param marketData Protocol-specific encoded market data
     * @param priceFeed The address of the price feed
     * @return The asset price
     */
    function getPrice(bytes calldata marketData, address priceFeed) external view returns (uint256);

    /**
     * @notice Checks if a manager has permission to act on behalf of an owner
     * @param marketData Protocol-specific encoded market data
     * @param owner The address of the account owner
     * @param manager The address of the potential manager
     * @return True if the manager has permission, false otherwise
     */
    function hasPermission(bytes calldata marketData, address owner, address manager) external view returns (bool);

    /**
     * @notice Supplies an asset to the market on behalf of a user
     * @param marketData Protocol-specific encoded market data
     * @param to The address to supply to
     * @param asset The asset to supply
     * @param amount The amount to supply
     */
    function supplyTo(bytes calldata marketData, address to, IERC20 asset, uint256 amount) external;

    /**
     * @notice Withdraws an asset from the market on behalf of a user
     * @param marketData Protocol-specific encoded market data
     * @param from The address to withdraw from
     * @param to The address to send withdrawn assets to
     * @param asset The asset to withdraw
     * @param amount The amount to withdraw
     */
    function withdrawFrom(bytes calldata marketData, address from, address to, IERC20 asset, uint256 amount) external;

    /**
     * @notice Grants allowance to the Foundation contract via signature (EIP-2612 style)
     * @param marketData Protocol-specific encoded market data
     * @param owner The address of the account owner
     * @param manager The address to grant permission to
     * @param isAllowed Whether to allow or disallow
     * @param nonce The nonce for replay protection
     * @param expiry The signature expiry timestamp
     * @param v ECDSA signature component
     * @param r ECDSA signature component
     * @param s ECDSA signature component
     */
    function allowBySig(
        bytes calldata marketData,
        address owner,
        address manager,
        bool isAllowed,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
