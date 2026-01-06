// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IComet } from "../../../external/compound/IComet.sol";
import { ICorePlugin } from "../../interfaces/ICorePlugin.sol";

/**
 * @title CompoundCorePlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Core plugin for integrating Compound V3 (Comet) protocol with V2 Foundation
 * @dev Implements ICorePlugin interface to provide standardized lending operations for Compound V3
 *
 * marketData encoding: abi.encode(cometAddress)
 */
contract CompoundCorePlugin is ICorePlugin {
    using SafeERC20 for IERC20;

    /// @notice Unique selector identifying this as a Compound core plugin
    bytes4 public constant CORE_SELECTOR = bytes4(keccak256("CompoundCorePlugin"));

    /**
     * @notice Decodes market data to get Comet address
     * @param marketData Encoded market data
     * @return comet The Comet contract address
     */
    function _decodeMarket(bytes calldata marketData) internal pure returns (IComet comet) {
        comet = IComet(abi.decode(marketData, (address)));
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function baseToken(bytes calldata marketData) external view returns (IERC20) {
        return _decodeMarket(marketData).baseToken();
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function baseScale(bytes calldata marketData) external view returns (uint256) {
        return _decodeMarket(marketData).baseScale();
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function borrowBalanceOf(bytes calldata marketData, address account) external view returns (uint256) {
        return _decodeMarket(marketData).borrowBalanceOf(account);
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function collateralBalanceOf(
        bytes calldata marketData,
        address account,
        IERC20 asset
    ) external view returns (uint256) {
        return _decodeMarket(marketData).collateralBalanceOf(account, asset);
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function getAssetInfo(bytes calldata marketData, IERC20 asset) external view returns (AssetInfo memory info) {
        IComet.AssetInfo memory cometInfo = _decodeMarket(marketData).getAssetInfoByAddress(asset);
        info = AssetInfo({
            asset: cometInfo.asset,
            priceFeed: cometInfo.priceFeed,
            scale: cometInfo.scale,
            borrowCollateralFactor: cometInfo.borrowCollateralFactor,
            liquidateCollateralFactor: cometInfo.liquidateCollateralFactor
        });
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function getPrice(bytes calldata marketData, address priceFeed) external view returns (uint256) {
        return _decodeMarket(marketData).getPrice(priceFeed);
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function hasPermission(bytes calldata marketData, address owner, address manager) external view returns (bool) {
        return _decodeMarket(marketData).hasPermission(owner, manager);
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function supplyTo(bytes calldata marketData, address to, IERC20 asset, uint256 amount) external {
        IComet comet = _decodeMarket(marketData);
        asset.safeIncreaseAllowance(address(comet), amount);
        comet.supplyTo(to, asset, amount);
    }

    /**
     * @inheritdoc ICorePlugin
     */
    function withdrawFrom(bytes calldata marketData, address from, address to, IERC20 asset, uint256 amount) external {
        _decodeMarket(marketData).withdrawFrom(from, to, asset, amount);
    }

    /**
     * @inheritdoc ICorePlugin
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
        _decodeMarket(marketData).allowBySig(owner, manager, isAllowed, nonce, expiry, v, r, s);
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
