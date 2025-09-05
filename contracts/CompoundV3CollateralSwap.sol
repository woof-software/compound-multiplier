// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IComet } from "./interfaces/IComet.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { ILiFiPlugin } from "./interfaces/ILiFiPlugin.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AllowBySig } from "./base/AllowBySig.sol";

contract CompoundV3CollateralSwap is AllowBySig {
    struct Plugin {
        address endpoint;
        address flp;
    }

    struct SwapParams {
        address user;
        address comet;
        bytes4 callbackSelector;
        address[] fromAssets; // users collaterals on comet
        uint256[] fromAmounts; // collaterals amount
        address[] toAssets; // final collaterals
        uint256[] flashLoanAmounts; // flashloan amounts
        bytes[] swapCalldata; // from sdk
        uint256[] minAmountsOut; // works with toAsset (health factor calculation)
        uint256 maxHealthFactorDropBps; // %
        address[] supplementalAssets; // TODO: to think
        uint256[] supplementalAmounts; // TODO: to think
    }

    /// @dev The scale for factors
    uint64 internal constant FACTOR_SCALE = 1e18;

    /// @dev The denominator for basis points (BPS), value declares 100%
    uint16 internal constant BPS_DROP_DENOMINATOR = 10_000;

    /// @notice Maps plugins callback selector to the plugin endpoint address
    mapping(bytes4 => Plugin) public plugins;

    event PluginRegistered(bytes4 indexed callbackSelector, address indexed pluginEndpoint, address indexed flp);

    error UnauthorizedCallback();
    error ZeroAddress();
    error UnknownPlugin();
    error NotSufficientLiquidity();
    error UnknownCallbackSelector();
    error FlashLoanFailed();
    error InsufficientAmountOut();
    error InvalidAmountOut();

    constructor(Plugin[] memory plugins_) payable {
        uint256 pluginsLength = plugins_.length;
        for (uint256 i = 0; i < pluginsLength; i++) {
            bytes4 pluginSelector = ICometFlashLoanPlugin(plugins_[i].endpoint).CALLBACK_SELECTOR();
            plugins[pluginSelector] = plugins_[i];

            emit PluginRegistered(pluginSelector, plugins_[i].endpoint, plugins_[i].flp);
        }
    }

    function swap(SwapParams calldata swapParams) external {
        _swap(swapParams);
    }

    function swapWithApprove(SwapParams calldata swapParams, AllowParams calldata allowParams) external {
        _allowBySig(allowParams, swapParams.comet);
        _swap(swapParams);
    }

    function _swap(SwapParams calldata swapParams) internal {
        address user = swapParams.user;
        address comet = swapParams.comet;

        require(user != address(0) || comet != address(0), ZeroAddress());

        require(
            _checkCollateralization(
                IComet(comet),
                swapParams.fromAssets[0],
                swapParams.toAssets[0],
                swapParams.fromAmounts[0],
                swapParams.minAmountsOut[0],
                swapParams.maxHealthFactorDropBps
            ),
            NotSufficientLiquidity()
        );

        Plugin memory plugin = plugins[swapParams.callbackSelector];
        require(plugin.endpoint != address(0), UnknownPlugin());

        uint256 amount = swapParams.flashLoanAmounts[0];
        address asset = swapParams.toAssets[0];

        (bool ok, ) = plugin.endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.takeFlashLoan.selector,
                swapParams.user,
                asset,
                plugin.flp,
                amount,
                "0x",
                swapParams.swapCalldata[0]
            )
        );
        require(ok, FlashLoanFailed());
    }

    fallback() external payable {
        address endpoint = plugins[msg.sig].endpoint;
        require(endpoint != address(0), UnknownCallbackSelector());

        (bool success, bytes memory payload) = endpoint.delegatecall(msg.data);
        _catch(success);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));

        require(IERC20(data.asset).balanceOf(address(this)) == data.snapshot + data.debt, InvalidAmountOut());

        /*
        Todo
            - supply loaned asset as collateral
            - withdraw collateral with expected amount
            - swap withdraw collateral into loaned asset
            - repay flashloan
        */
        // (success, ) = endpoint.delegatecall(
        //     abi.encodeWithSignature(
        //         ILiFiPlugin.executeSwap.selector,
        //         router,
        //         data.srcToken,
        //         data.dstToken,
        //         data.minAmountOut,
        //         data.swapData
        //     )
        // );

        (success, ) = endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.repayFlashLoan.selector,
                data.flp,
                data.asset,
                data.debt + data.flashLoanFee
            )
        );
        _catch(success);
    }

    receive() external payable {
        revert("Cannot receive ETH");
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

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
