// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IMorphoBlue } from "../../../external/morpho/IMorphoBlue.sol";
import { ICorePlugin } from "../../interfaces/ICorePlugin.sol";
import { IAlerts as IA } from "../../interfaces/IAlerts.sol";

/**
 * @title MorphoCorePlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Core plugin for integrating Morpho Blue protocol with V2 Foundation
 * @dev Implements ICorePlugin interface to provide standardized lending operations for Morpho
 */
contract MorphoCorePlugin is ICorePlugin {
    using SafeERC20 for IERC20;

    /// @notice Unique selector identifying this as a Morpho core plugin
    bytes4 public constant CORE_SELECTOR = bytes4(keccak256("MorphoCorePlugin"));

    /**
     * @notice Decodes market data to get Morpho address and market params
     * @param marketData Encoded market data
     * @return morpho The Morpho Blue contract address
     * @return params The market parameters
     */
    function _decodeMarket(
        bytes calldata marketData
    ) internal pure returns (address morpho, IMorphoBlue.MarketParams memory params) {
        (morpho, params) = abi.decode(marketData, (address, IMorphoBlue.MarketParams));
    }

    /**
     * @notice Computes the market ID from market parameters
     * @param params The market parameters
     * @return The market ID (keccak256 hash of encoded params)
     */
    function _marketId(IMorphoBlue.MarketParams memory params) internal pure returns (bytes32) {
        return keccak256(abi.encode(params));
    }

    /**
     * @notice Gets the decimals of a token
     * @param token The token address
     * @return The number of decimals
     */
    function _decimals(address token) internal view returns (uint8) {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (success && data.length >= 32) {
            return abi.decode(data, (uint8));
        }
        return 18; // Default to 18 decimals
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev For Morpho Blue, base token is the loan token from market params
     */
    function baseToken(bytes calldata marketData) external pure returns (IERC20) {
        (, IMorphoBlue.MarketParams memory params) = _decodeMarket(marketData);
        return IERC20(params.loanToken);
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Returns the scale of the loan token
     */
    function baseScale(bytes calldata marketData) external view returns (uint256) {
        (, IMorphoBlue.MarketParams memory params) = _decodeMarket(marketData);
        return 10 ** _decimals(params.loanToken);
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Returns the borrow balance by converting borrow shares to assets
     */
    function borrowBalanceOf(bytes calldata marketData, address account) external view returns (uint256) {
        (address morpho, IMorphoBlue.MarketParams memory params) = _decodeMarket(marketData);
        bytes32 id = _marketId(params);

        IMorphoBlue.Position memory pos = IMorphoBlue(morpho).position(id, account);
        IMorphoBlue.Market memory mkt = IMorphoBlue(morpho).market(id);

        if (mkt.totalBorrowShares == 0) return 0;
        return (uint256(pos.borrowShares) * mkt.totalBorrowAssets) / mkt.totalBorrowShares;
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Returns the collateral balance from the position
     */
    function collateralBalanceOf(
        bytes calldata marketData,
        address account,
        IERC20 asset
    ) external view returns (uint256) {
        (address morpho, IMorphoBlue.MarketParams memory params) = _decodeMarket(marketData);
        require(address(asset) == params.collateralToken, IA.InvalidCollateral());

        IMorphoBlue.Position memory pos = IMorphoBlue(morpho).position(_marketId(params), account);
        return pos.collateral;
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Returns asset info derived from Morpho market params
     */
    function getAssetInfo(bytes calldata marketData, IERC20 asset) external view returns (AssetInfo memory info) {
        (, IMorphoBlue.MarketParams memory params) = _decodeMarket(marketData);

        require(address(asset) == params.collateralToken || address(asset) == params.loanToken, IA.InvalidCollateral());

        // For collateral asset
        if (address(asset) == params.collateralToken) {
            info = AssetInfo({
                asset: params.collateralToken,
                priceFeed: params.oracle,
                scale: uint64(10 ** _decimals(params.collateralToken)),
                borrowCollateralFactor: uint64(params.lltv),
                liquidateCollateralFactor: uint64(params.lltv)
            });
        } else {
            info = AssetInfo({
                asset: params.loanToken,
                priceFeed: params.oracle,
                scale: uint64(10 ** _decimals(params.loanToken)),
                borrowCollateralFactor: 0,
                liquidateCollateralFactor: 0
            });
        }
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Price handling for Morpho - placeholder implementation
     */
    function getPrice(bytes calldata marketData, address priceFeed) external pure returns (uint256) {
        return 1e18; //TODO
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function hasPermission(bytes calldata marketData, address owner, address manager) external view returns (bool) {
        (address morpho, ) = _decodeMarket(marketData);
        return IMorphoBlue(morpho).isAuthorized(owner, manager);
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Supplies collateral or repays debt to Morpho Blue market
     */
    function supplyTo(bytes calldata marketData, address to, IERC20 asset, uint256 amount) external {
        (address morpho, IMorphoBlue.MarketParams memory params) = _decodeMarket(marketData);

        asset.safeIncreaseAllowance(morpho, amount);

        if (address(asset) == params.collateralToken) {
            IMorphoBlue(morpho).supplyCollateral(params, amount, to, "");
        } else if (address(asset) == params.loanToken) {
            IMorphoBlue(morpho).supply(params, amount, 0, to, "");
        } else {
            revert IA.InvalidCollateral();
        }
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Withdraws collateral or borrows from Morpho Blue market
     */
    function withdrawFrom(bytes calldata marketData, address from, address to, IERC20 asset, uint256 amount) external {
        (address morpho, IMorphoBlue.MarketParams memory params) = _decodeMarket(marketData);

        if (address(asset) == params.collateralToken) {
            IMorphoBlue(morpho).withdrawCollateral(params, amount, from, to);
        } else if (address(asset) == params.loanToken) {
            IMorphoBlue(morpho).borrow(params, amount, 0, from, to);
        } else {
            revert IA.InvalidCollateral();
        }
    }

    /**
     * @inheritdoc ICorePlugin
     * @dev Sets authorization via signature for Morpho Blue
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
    ) external {
        (address morpho, ) = _decodeMarket(marketData);

        IMorphoBlue.Authorization memory auth = IMorphoBlue.Authorization({
            authorizer: owner,
            authorized: manager,
            isAuthorized: isAllowed,
            nonce: nonce,
            deadline: expiry
        });

        IMorphoBlue.Signature memory sig = IMorphoBlue.Signature({ v: v, r: r, s: s });

        IMorphoBlue(morpho).setAuthorizationWithSig(auth, sig);
    }

    /**
     * @notice Checks interface support
     * @param interfaceId The interface identifier
     * @return True if the interface is supported, false otherwise
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICorePlugin).interfaceId;
    }
}
