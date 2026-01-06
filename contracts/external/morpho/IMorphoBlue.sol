// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IMorphoBlue
/// @author Morpho Labs
/// @notice Interface for Morpho Blue lending protocol
/// @dev Extended interface for core lending operations in addition to flash loans
interface IMorphoBlue {
    /// @notice The market parameters that uniquely identify a market
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    /// @notice The market state
    struct Market {
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint128 lastUpdate;
        uint128 fee;
    }

    /// @notice The position state of a user in a market
    struct Position {
        uint256 supplyShares;
        uint128 borrowShares;
        uint128 collateral;
    }

    /// @notice Executes a flash loan
    /// @param token The token to flash loan
    /// @param assets The amount of assets to flash loan
    /// @param data The data to pass to the callback
    function flashLoan(IERC20 token, uint256 assets, bytes calldata data) external;

    /// @notice Supplies assets to a market
    /// @param marketParams The market parameters
    /// @param assets The amount of assets to supply (0 if shares is set)
    /// @param shares The amount of shares to mint (0 if assets is set)
    /// @param onBehalf The address to supply on behalf of
    /// @param data Arbitrary data to pass to the callback
    /// @return assetsSupplied The actual amount of assets supplied
    /// @return sharesSupplied The actual amount of shares minted
    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    /// @notice Withdraws assets from a market
    /// @param marketParams The market parameters
    /// @param assets The amount of assets to withdraw (0 if shares is set)
    /// @param shares The amount of shares to burn (0 if assets is set)
    /// @param onBehalf The address to withdraw from
    /// @param receiver The address to receive the withdrawn assets
    /// @return assetsWithdrawn The actual amount of assets withdrawn
    /// @return sharesWithdrawn The actual amount of shares burned
    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /// @notice Supplies collateral to a market
    /// @param marketParams The market parameters
    /// @param assets The amount of collateral to supply
    /// @param onBehalf The address to supply on behalf of
    /// @param data Arbitrary data to pass to the callback
    function supplyCollateral(
        MarketParams memory marketParams,
        uint256 assets,
        address onBehalf,
        bytes memory data
    ) external;

    /// @notice Withdraws collateral from a market
    /// @param marketParams The market parameters
    /// @param assets The amount of collateral to withdraw
    /// @param onBehalf The address to withdraw from
    /// @param receiver The address to receive the withdrawn collateral
    function withdrawCollateral(
        MarketParams memory marketParams,
        uint256 assets,
        address onBehalf,
        address receiver
    ) external;

    /// @notice Borrows assets from a market
    /// @param marketParams The market parameters
    /// @param assets The amount of assets to borrow (0 if shares is set)
    /// @param shares The amount of shares to mint (0 if assets is set)
    /// @param onBehalf The address to borrow on behalf of
    /// @param receiver The address to receive the borrowed assets
    /// @return assetsBorrowed The actual amount of assets borrowed
    /// @return sharesBorrowed The actual amount of shares minted
    function borrow(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);

    /// @notice Repays assets to a market
    /// @param marketParams The market parameters
    /// @param assets The amount of assets to repay (0 if shares is set)
    /// @param shares The amount of shares to burn (0 if assets is set)
    /// @param onBehalf The address to repay on behalf of
    /// @param data Arbitrary data to pass to the callback
    /// @return assetsRepaid The actual amount of assets repaid
    /// @return sharesRepaid The actual amount of shares burned
    function repay(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

    /// @notice Returns the position of an account in a market
    /// @param id The market id
    /// @param account The account address
    /// @return The position struct
    function position(bytes32 id, address account) external view returns (Position memory);

    /// @notice Returns the market state
    /// @param id The market id
    /// @return The market struct
    function market(bytes32 id) external view returns (Market memory);

    /// @notice Returns the market params from its id
    /// @param id The market id
    /// @return The market params
    function idToMarketParams(bytes32 id) external view returns (MarketParams memory);

    /// @notice Sets authorization for a manager
    /// @param authorized The address to authorize
    /// @param newIsAuthorized Whether to authorize or de-authorize
    function setAuthorization(address authorized, bool newIsAuthorized) external;

    /// @notice Sets authorization via signature
    /// @param authorization The authorization struct
    /// @param signature The signature struct
    function setAuthorizationWithSig(Authorization memory authorization, Signature memory signature) external;

    /// @notice Returns whether an account is authorized
    /// @param authorizer The authorizer address
    /// @param authorized The authorized address
    /// @return Whether the authorization is granted
    function isAuthorized(address authorizer, address authorized) external view returns (bool);

    /// @notice Authorization parameters
    struct Authorization {
        address authorizer;
        address authorized;
        bool isAuthorized;
        uint256 nonce;
        uint256 deadline;
    }

    /// @notice Signature components
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @notice Returns the nonce of an account
    /// @param account The account address
    /// @return The nonce
    function nonce(address account) external view returns (uint256);
}
