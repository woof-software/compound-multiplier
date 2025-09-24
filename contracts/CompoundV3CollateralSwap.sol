// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AllowBySig } from "./base/AllowBySig.sol";

import { IComet } from "./interfaces/IComet.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { ICompoundV3CollateralSwap } from "./interfaces/ICompoundV3CollateralSwap.sol";
import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";

contract CompoundV3CollateralSwap is AllowBySig, ICompoundV3CollateralSwap {
    /// @dev The scale for factors
    uint64 public constant FACTOR_SCALE = 1e18;

    /// @dev The denominator for basis points (BPS), value declares 100%
    uint16 public constant BPS_DROP_DENOMINATOR = 10_000;

    /// @dev Storage slot for temporary adapter data
    bytes32 public constant SLOT_ADAPTER = bytes32(uint256(keccak256("CompoundV3CollateralSwap.adapter")) - 1);

    /// @inheritdoc ICompoundV3CollateralSwap
    address public immutable swapRouter;

    /// @inheritdoc ICompoundV3CollateralSwap
    address public immutable swapPlugin;

    /// @notice Maps plugins callback selector to the plugin endpoint address
    mapping(bytes4 => Plugin) public plugins;

    /**
     * @notice Constructor
     * @param plugins_ Array of plugin structs
     * @param swapRouter_ Address of the swap router
     * @param swapPlugin_ Address of the swap plugin
     * @dev Emits PluginRegistered event for each registered plugin
     */
    constructor(Plugin[] memory plugins_, address swapRouter_, address swapPlugin_) {
        uint256 pluginsLength = plugins_.length;
        require(pluginsLength != 0, ZeroLength());
        require(swapRouter_ != address(0) && swapPlugin_ != address(0), ZeroAddress());

        swapRouter = swapRouter_;
        swapPlugin = swapPlugin_;
        for (uint256 i = 0; i < pluginsLength; i++) {
            bytes4 pluginSelector = ICometFlashLoanPlugin(plugins_[i].endpoint).CALLBACK_SELECTOR();
            plugins[pluginSelector] = plugins_[i];

            emit PluginRegistered(pluginSelector, plugins_[i].endpoint, plugins_[i].flp);
        }
    }

    /**
     * @notice Handles flash loan callbacks from registered plugins to execute collateral swaps
     * @dev This fallback function is the core of the collateral swap mechanism. It receives callbacks
     *      from flash loan providers through registered plugins and executes a complete collateral swap:
     *      1. Validates the callback is from an authorized source
     *      2. Decodes the callback data and retrieves swap parameters
     *      3. Supplies the borrowed asset to Comet on behalf of the user
     *      4. Withdraws the user's collateral to be swapped
     *      5. Swaps the withdrawn collateral for the borrowed asset to repay the loan
     *      6. Supplies any remaining dust amounts back to the user
     *      7. Repays the flash loan with fees
     *
     * The function uses delegate calls to plugin endpoints for modularity and gas efficiency.
     * Temporary storage (tstore/tload) is used to pass swap parameters between function calls.
     *
     * @custom:security This function validates the caller is an authorized flash loan provider
     * @custom:security Uses tstore/tload for temporary parameter storage to avoid storage slot collisions
     * @custom:security Validates exact token balance requirements before and after operations
     * @custom:returns Returns uint256(1) to signal successful completion (required by some flash loan providers like AAVE)
     *
     * Requirements:
     * - msg.sig must correspond to a registered plugin callback selector
     * - msg.sender must be the registered flash loan provider for the callback selector
     * - The contract must receive exactly the expected amount of borrowed tokens
     * - The swap must produce enough tokens to repay the flash loan plus fees
     * - All delegate calls to plugins must succeed
     *
     * Reverts:
     * - UnknownCallbackSelector: If msg.sig doesn't match any registered plugin
     * - UnauthorizedCallback: If msg.sender is not the authorized flash loan provider
     * - InvalidAmountOut: If token balances don't match expectations after operations
     * - May revert with plugin-specific errors if delegate calls fail
     */
    fallback() external {
        address endpoint = plugins[msg.sig].endpoint;
        require(endpoint != address(0), UnknownCallbackSelector());
        require(msg.sender == plugins[msg.sig].flp, UnauthorizedCallback());

        (bool success, bytes memory payload) = endpoint.delegatecall(msg.data);
        _catch(success);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));
        address asset = data.asset;
        address user = data.user;
        uint256 debt = data.debt;

        require(IERC20(asset).balanceOf(address(this)) == data.snapshot + debt, InvalidAmountOut());

        (address comet, address fromAsset, uint256 fromAmount) = _tload();

        IERC20(asset).approve(comet, debt);
        IComet(comet).supplyTo(user, asset, debt);
        IComet(comet).withdrawFrom(user, address(this), fromAsset, fromAmount);

        uint256 repayAmount = debt + data.fee;

        // Swap withdrawn asset to repay the flash loan
        (success, ) = swapPlugin.delegatecall(
            abi.encodeWithSelector(
                ICometSwapPlugin.executeSwap.selector,
                fromAsset,
                asset,
                fromAmount,
                repayAmount,
                abi.encode(swapRouter),
                data.swapData
            )
        );
        _catch(success);

        _supplyDust(user, fromAsset, comet, 0);
        _supplyDust(user, asset, comet, repayAmount);

        (success, ) = endpoint.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector, data.flp, asset, repayAmount)
        );
        _catch(success);

        // Note Return 1 to the caller to signal success (required by AAVE)
        assembly {
            mstore(0x00, 1)
            return(0x00, 0x20)
        }
    }

    /**
     * @notice Rejects any direct ETH transfers
     * @dev This contract does not handle ETH, all operations are with ERC20 tokens
     */
    receive() external payable {
        revert("Can not receive ETH");
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICompoundV3CollateralSwap
    function swap(SwapParams calldata swapParams) external {
        _swap(swapParams);
    }

    /// @inheritdoc ICompoundV3CollateralSwap
    function swapWithApprove(SwapParams calldata swapParams, AllowParams calldata allowParams) external {
        _allowBySig(allowParams, swapParams.comet);
        _swap(swapParams);
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

    function _swap(SwapParams calldata swapParams) internal {
        Plugin memory plugin = plugins[swapParams.callbackSelector];
        address comet = swapParams.comet;
        address toAsset = swapParams.toAsset;
        address fromAsset = swapParams.fromAsset;
        uint256 minAmountOut = swapParams.minAmountOut;
        uint256 fromAmount = swapParams.fromAmount;

        _validateSwapParams(swapParams);
        require(plugin.endpoint != address(0), UnknownPlugin());
        require(
            _checkCollateralization(
                IComet(comet),
                fromAsset,
                toAsset,
                fromAmount,
                minAmountOut,
                swapParams.maxHealthFactorDropBps
            ),
            NotSufficientLiquidity()
        );

        _tstore(comet, fromAsset, fromAmount);

        (bool ok, ) = plugin.endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.takeFlashLoan.selector,
                ICometFlashLoanPlugin.CallbackData({
                    debt: minAmountOut,
                    snapshot: IERC20(toAsset).balanceOf(address(this)),
                    fee: 0,
                    user: msg.sender,
                    flp: plugin.flp,
                    asset: toAsset,
                    swapData: swapParams.swapCalldata
                }),
                ""
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

    /**
     * @dev Stores swap parameters in transient storage for use in fallback callback
     * @param comet The Comet contract address
     * @param fromAsset The asset being swapped from
     * @param fromAmount The amount being swapped
     */
    function _tstore(address comet, address fromAsset, uint256 fromAmount) internal {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            tstore(slot, fromAmount)
            tstore(add(slot, 0x20), comet)
            tstore(add(slot, 0x40), fromAsset)
        }
    }

    /**
     * @dev Loads and clears swap parameters from transient storage
     * @return comet The Comet contract address
     * @return fromAsset The asset being swapped from
     * @return fromAmount The amount being swapped
     */
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

    /**
     * @dev Validates swap parameters for correctness and safety
     * @param swapParams The swap parameters to validate
     */
    function _validateSwapParams(SwapParams calldata swapParams) internal pure {
        require(
            swapParams.comet != address(0) &&
                swapParams.fromAsset != address(0) &&
                swapParams.toAsset != address(0) &&
                swapParams.minAmountOut > 0 &&
                swapParams.maxHealthFactorDropBps < BPS_DROP_DENOMINATOR,
            InvalidSwapParameters()
        );
    }

    /**
     * @dev Supplies any remaining asset balance back to user's Comet position
     * @param user The user to supply dust to
     * @param asset The asset to supply
     * @param comet The Comet contract address
     * @param repayAmount Amount reserved for repayment (excluded from dust)
     */
    function _supplyDust(address user, address asset, address comet, uint256 repayAmount) internal {
        uint256 balance = IERC20(asset).balanceOf(address(this)) - repayAmount;
        if (balance != 0) {
            IERC20(asset).approve(comet, balance);
            IComet(comet).supplyTo(user, asset, balance);
        }
    }

    /**
     * @dev Reverts with the original error if a call failed
     * @param success Whether the call succeeded
     */
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
