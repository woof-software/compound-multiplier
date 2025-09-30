// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AllowBySig } from "./base/AllowBySig.sol";

import { IComet } from "./external/IComet.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { ICompoundV3CollateralSwap } from "./interfaces/ICompoundV3CollateralSwap.sol";
import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";

/**
 * @title CompoundV3CollateralSwap
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 *
 * @dev This contract allows users to swap one type of collateral for another in their Compound V3 position
 *      without needing to close their borrowing position. The process works by:
 *      1. Taking a flash loan of the desired collateral asset
 *      2. Supplying the flash loan to the user's Compound position
 *      3. Withdrawing the user's existing collateral
 *      4. Swapping the withdrawn collateral for the borrowed asset to repay the flash loan
 *      5. Supplying any remaining dust back to the user's position
 *
 *      The contract supports multiple flash loan providers through a modular plugin system and
 *      uses configurable swap plugins for executing the collateral swap.
 * @dev Features:
 *      - Multi-protocol flash loan support
 *      - Modular swap execution through dedicated swap plugins
 *      - Health factor validation to ensure position remains safe after swap
 *      - Gas-optimized execution using delegate calls and transient storage
 *      - Signature-based approvals for gasless transactions
 *      - Comprehensive slippage protection and validation
 * @dev Security Features:
 *      - Callback validation ensures only registered plugins can execute operations
 *      - Health factor checks prevent unsafe position modifications
 *      - Exact balance validation before and after operations
 *      - Transient storage prevents storage slot collisions
 *      - Comprehensive input validation and error handling
 * @dev Architecture:
 *      - Uses fallback() function as a universal callback handler for flash loan providers
 *      - Employs plugin pattern for extensibility and protocol abstraction
 *      - Integrates with AllowBySig for meta-transaction support
 *      - Optimized for gas efficiency through minimal storage usage
 * @custom:security-considerations
 *      - Users must have sufficient collateral to maintain healthy positions after swaps
 *      - Flash loan fees are automatically accounted for in minimum output calculations
 *      - Slippage protection is enforced through minAmountOut parameter validation
 *      - Only registered and validated plugins can execute flash loans and swaps
 *      - Plugins are configured exclusively during contract deployment. To add or modify plugins,
 *        redeployment of the contract is required.
 */
contract CompoundV3CollateralSwap is AllowBySig, ICompoundV3CollateralSwap {
    /// @dev Offset for the comet contract address
    uint256 private constant COMET_OFFSET = 0x20;

    /// @dev Offset for the fromAsset parameter
    uint256 private constant FROM_ASSET_OFFSET = 0x40;

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
     * - InvalidAmountOut: If token balances don't match expectations after operations
     * - May revert with plugin-specific errors if delegate calls fail
     */
    fallback() external {
        address endpoint = plugins[msg.sig].endpoint;
        require(endpoint != address(0), UnknownCallbackSelector());

        (bool success, bytes memory payload) = endpoint.delegatecall(msg.data);
        _catch(success);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));
        IERC20 asset = IERC20(data.asset);
        address user = data.user;
        uint256 debt = data.debt;

        require(asset.balanceOf(address(this)) == data.snapshot + debt, InvalidAmountOut());

        (address cometAddr, address fromAsset, uint256 fromAmount) = _tload();
        IComet comet = IComet(cometAddr);

        asset.approve(address(comet), debt);
        comet.supplyTo(user, address(asset), debt);
        comet.withdrawFrom(user, address(this), fromAsset, fromAmount);

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

        _supplyDust(user, IERC20(fromAsset), comet, 0);
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

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICompoundV3CollateralSwap
    function swap(SwapParams calldata swapParams) external {
        _swap(swapParams);
    }

    /// @inheritdoc ICompoundV3CollateralSwap
    function swapWithPermit(SwapParams calldata swapParams, AllowParams calldata allowParams) external {
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
     *
     * @dev Liquidity is calculated based on comet implementation.
     * Implementation: https://github.com/compound-finance/comet/blob/main/contracts/Comet.sol#L544-L553
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
            tstore(add(slot, COMET_OFFSET), comet)
            tstore(add(slot, FROM_ASSET_OFFSET), fromAsset)
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
            comet := tload(add(slot, COMET_OFFSET))
            fromAsset := tload(add(slot, FROM_ASSET_OFFSET))

            tstore(slot, 0)
            tstore(add(slot, COMET_OFFSET), 0)
            tstore(add(slot, FROM_ASSET_OFFSET), 0)
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
    function _supplyDust(address user, IERC20 asset, IComet comet, uint256 repayAmount) internal {
        uint256 balance = asset.balanceOf(address(this)) - repayAmount;
        if (balance != 0) {
            asset.approve(address(comet), balance);
            comet.supplyTo(user, address(asset), balance);
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
