// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IComet } from "./interfaces/IComet.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { ILiFiPlugin } from "./interfaces/ILiFiPlugin.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AllowBySig } from "./base/AllowBySig.sol";
import { ICompoundV3CollateralSwap } from "./interfaces/ICompoundV3CollateralSwap.sol";

contract CompoundV3CollateralSwap is AllowBySig, ICompoundV3CollateralSwap {
    /// @dev The scale for factors
    uint64 public constant FACTOR_SCALE = 1e18;

    /// @dev The denominator for basis points (BPS), value declares 100%
    uint16 public constant BPS_DROP_DENOMINATOR = 10_000;

    bytes32 public constant SLOT_ADAPTER = bytes32(uint256(keccak256("CompoundV3CollateralSwap.adapter")) - 1);

    /// @inheritdoc ICompoundV3CollateralSwap
    address public immutable swapRouter;

    /// @notice Maps plugins callback selector to the plugin endpoint address
    mapping(bytes4 => Plugin) public plugins;

    constructor(Plugin[] memory plugins_, address swapRouter_) {
        uint256 pluginsLength = plugins_.length;
        require(pluginsLength != 0, ZeroLength());
        require(swapRouter_ != address(0), ZeroAddress());

        swapRouter = swapRouter_;
        for (uint256 i = 0; i < pluginsLength; i++) {
            bytes4 pluginSelector = ICometFlashLoanPlugin(plugins_[i].endpoint).CALLBACK_SELECTOR();
            plugins[pluginSelector] = plugins_[i];

            emit PluginRegistered(pluginSelector, plugins_[i].endpoint, plugins_[i].flp);
        }
    }

    receive() external payable {
        revert("Cannot receive ETH");
    }

    fallback() external payable {
        address endpoint = plugins[msg.sig].endpoint;
        require(endpoint != address(0), UnknownCallbackSelector());

        (bool success, bytes memory payload) = endpoint.delegatecall(msg.data);
        _catch(success);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));

        require(IERC20(data.asset).balanceOf(address(this)) == data.snapshot + data.debt, InvalidAmountOut());

        (address comet, address fromAsset, uint256 fromAmount) = _tload();

        IComet(comet).supplyTo(data.user, data.asset, data.debt);
        IComet(comet).withdrawFrom(data.user, address(this), fromAsset, fromAmount);

        (success, ) = endpoint.delegatecall(
            abi.encodeWithSelector(
                ILiFiPlugin.executeSwap.selector,
                swapRouter,
                fromAsset,
                data.asset,
                IERC20(fromAsset).balanceOf(address(this)),
                data.debt + data.fee,
                data.swapData
            )
        );

        (success, ) = endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.repayFlashLoan.selector,
                data.flp,
                data.asset,
                data.debt + data.fee
            )
        );
        _catch(success);

        // Note
        // check if there any dust of tokens on the contract

        // Note Return 1 to the caller to signal success (required by AAVE)
        assembly {
            mstore(0x00, 1)
            return(0x00, 0x20)
        }
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    function swap(SwapParams calldata swapParams) external {
        _swap(swapParams);
    }

    function swapWithApprove(SwapParams calldata swapParams, AllowParams calldata allowParams) external {
        _allowBySig(allowParams, swapParams.comet);
        _swap(swapParams);
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

    function _swap(SwapParams calldata swapParams) internal {
        Plugin memory plugin = plugins[swapParams.callbackSelector];
        address user = swapParams.user;
        address comet = swapParams.comet;
        address toAsset = swapParams.toAsset;

        require(user != address(0) && comet != address(0), ZeroAddress());
        require(
            _checkCollateralization(
                IComet(comet),
                swapParams.fromAsset,
                toAsset,
                swapParams.fromAmount,
                swapParams.minAmountOut,
                swapParams.maxHealthFactorDropBps
            ),
            NotSufficientLiquidity()
        );
        require(plugin.endpoint != address(0), UnknownPlugin());

        _tstore(comet, swapParams.fromAsset, swapParams.fromAmount);

        (bool ok, ) = plugin.endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.takeFlashLoan.selector,
                ICometFlashLoanPlugin.CallbackData({
                    debt: swapParams.minAmountOut,
                    snapshot: IERC20(toAsset).balanceOf(address(this)),
                    fee: 0,
                    user: user,
                    flp: plugin.flp,
                    asset: toAsset,
                    swapData: swapParams.swapCalldata
                }),
                "" // config
            )
        );
        _catch(ok);
    }

    /**
     * @dev Checks if the collateralization is sufficient for the swap.
     * @param comet The Comet contract instance.
     * @param assetFrom The address of the asset being swapped from.
     * @param assetTo The address of the asset being swapped to.
     * @param fromAmount The amount of the asset being swapped from.
     * @param minAmountOut The minimum amount of the asset being swapped to.
     * @param maxHealthFactorDropBps The maximum allowed drop in health factor (in basis points).
     */
    function _checkCollateralization(
        IComet comet,
        address assetFrom,
        address assetTo,
        uint256 fromAmount,
        uint256 minAmountOut,
        uint256 maxHealthFactorDropBps
    ) internal view returns (bool) {
        IComet.AssetInfo memory assetInfoFrom = comet.getAssetInfoByAddress(assetFrom);
        IComet.AssetInfo memory assetInfoTo = comet.getAssetInfoByAddress(assetTo);

        uint256 assetFromLiquidity = Math.mulDiv(
            Math.mulDiv(fromAmount, comet.getPrice(assetInfoFrom.priceFeed), assetInfoFrom.scale),
            assetInfoFrom.borrowCollateralFactor,
            FACTOR_SCALE
        );

        uint256 assetInLiquidity = Math.mulDiv(
            Math.mulDiv(minAmountOut, comet.getPrice(assetInfoTo.priceFeed), assetInfoTo.scale),
            assetInfoTo.borrowCollateralFactor,
            FACTOR_SCALE
        );

        return
            Math.mulDiv(assetFromLiquidity, (BPS_DROP_DENOMINATOR - maxHealthFactorDropBps), BPS_DROP_DENOMINATOR) <
            assetInLiquidity;
    }

    function _tstore(address comet, address fromAsset, uint256 fromAmount) internal {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            tstore(slot, fromAmount)
            tstore(add(slot, 0x20), comet)
            tstore(add(slot, 0x40), fromAsset)
        }
    }

    function _tload() internal returns (address comet, address fromAsset, uint256 fromAmount) {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            fromAmount := tload(slot)
            comet := tload(add(slot, 0x20))
            fromAsset := tload(add(slot, 0x40))

            tstore(slot, 0)
            tstore(add(slot, 0x20), 0)
            tstore(add(slot, 0x40), 0)
        }
    }

    function _catch(bool success) internal pure {
        if (!success) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }
    }
}
