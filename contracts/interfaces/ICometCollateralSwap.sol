// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { AllowBySig } from "../base/AllowBySig.sol";

/**
 * @title ICometCollateralSwap
 * @author Woof Software
 * @notice Interface for CompoundV3 collateral swap contract
 * @dev This contract enables users to swap one collateral asset for another within their Compound V3 position
 *      using flash loans. The swap maintains the user's debt position while changing their collateral composition.
 */
interface ICometCollateralSwap {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Configuration for flash loan plugin endpoints
     * @dev Each plugin provides flash loan functionality from different providers (Uniswap V3, AAVE, Morpho, etc.)
     * @param endpoint The address of the plugin contract that handles flash loan logic
     * @param flp The address of the flash loan provider (pool, vault, etc.) used by this plugin
     */
    struct Plugin {
        address endpoint;
        address flp;
    }

    /**
     * @notice Parameters required to execute a collateral swap
     * @dev Contains all necessary information for the swap including assets, amounts, slippage protection, and swap routing
     * @param comet The address of the Compound V3 Comet contract for this market
     * @param callbackSelector The bytes4 selector identifying which flash loan plugin to use
     * @param fromAsset The address of the collateral asset to swap from (must be a valid Comet collateral)
     * @param fromAmount The amount of fromAsset to swap (must be <= user's collateral balance)
     * @param toAsset The address of the collateral asset to swap to (must be a valid Comet collateral)
     * @param swapCalldata The encoded calldata for the swap router to execute the asset exchange
     * @param minAmountOut The minimum amount of toAsset expected from the swap (slippage protection)
     * @param maxHealthFactorDropBps Maximum allowed drop in health factor in basis points (10000 = 100%)
     */
    struct SwapParams {
        address comet;
        bytes4 callbackSelector;
        address fromAsset;
        uint256 fromAmount;
        address toAsset;
        bytes swapCalldata;
        uint256 minAmountOut;
        uint256 maxHealthFactorDropBps;
    }

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when a new flash loan plugin is registered
     * @dev This event is fired during contract construction for each plugin
     * @param callbackSelector The unique bytes4 selector for this plugin's callback function
     * @param pluginEndpoint The address of the plugin contract
     * @param flp The address of the flash loan provider this plugin interfaces with
     */
    event PluginRegistered(bytes4 indexed callbackSelector, address indexed pluginEndpoint, address indexed flp);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Thrown when a flash loan callback is received from an unauthorized source
     * @dev Only the registered flash loan provider for a given callback selector may call back
     */
    error UnauthorizedCallback();

    /**
     * @notice Thrown when a zero address is provided where a valid address is required
     * @dev Prevents configuration errors during contract deployment
     */
    error ZeroAddress();

    /**
     * @notice Thrown when trying to use a plugin that hasn't been registered
     * @dev Occurs when callbackSelector in SwapParams doesn't match any registered plugin
     */
    error UnknownPlugin();

    /**
     * @notice Thrown when the swap would result in insufficient collateralization
     * @dev The health factor check fails, meaning the swap would make the position too risky
     */
    error NotSufficientLiquidity();

    /**
     * @notice Thrown when a fallback function receives an unknown callback selector
     * @dev The msg.sig doesn't correspond to any registered flash loan plugin callback
     */
    error UnknownCallbackSelector();

    /**
     * @notice Thrown when a flash loan operation fails
     * @dev General error for flash loan execution failures
     */
    error FlashLoanFailed();

    /**
     * @notice Thrown when the actual swap output is less than the minimum required
     * @dev Slippage protection - the swap didn't produce enough of the target asset
     */
    error InsufficientAmountOut();

    /**
     * @notice Thrown when token balance validations fail during swap execution
     * @dev Contract's token balances don't match expected values after flash loan operations
     */
    error InvalidAmountOut();

    /**
     * @notice Thrown when an array parameter has zero length where content is required
     * @dev Prevents deployment with empty plugin arrays
     */
    error ZeroLength();

    /**
     * @notice Thrown when SwapParams contain invalid values
     * @dev Covers cases like zero addresses, zero amounts, or invalid health factor parameters
     */
    error InvalidSwapParameters();

    /*//////////////////////////////////////////////////////////////
                             VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the address of the swap router contract
     * @dev The router handles the actual token swapping logic (e.g., 1inch aggregator)
     * @return The address of the swap router
     */
    function swapRouter() external view returns (address);

    /**
     * @notice Returns the address of the swap plugin contract
     * @dev The plugin encapsulates swap logic and integrates with the chosen DEX aggregator
     * @return The address of the swap plugin
     */
    function swapPlugin() external view returns (address);

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a collateral swap using flash loans
     * @dev The main entry point for swapping collateral assets in a Compound V3 position.
     *      This function:
     *      1. Validates swap parameters and health factor impact
     *      2. Initiates a flash loan for the target asset amount
     *      3. Supplies the borrowed asset to increase collateral
     *      4. Withdraws the original collateral to be swapped
     *      5. Swaps the withdrawn asset for the borrowed asset
     *      6. Repays the flash loan plus any fees
     *      7. Supplies any remaining dust back to the user's position
     *
     * @param swapParams The complete parameter struct defining the swap operation
     *
     * Requirements:
     * - Caller must have sufficient collateral balance of fromAsset
     * - Caller must have granted allowance to this contract on the Comet
     * - The swap must not violate health factor constraints
     * - The callbackSelector must correspond to a registered plugin
     * - The swap must produce enough toAsset to repay the flash loan plus fees
     *
     * @custom:security Validates collateralization before executing swap
     * @custom:security Uses registered plugins only to prevent malicious callbacks
     * @custom:security Validates exact token balance requirements throughout execution
     */
    function swap(SwapParams calldata swapParams) external;

    /**
     * @notice Executes a collateral swap with signature-based authorization in a single transaction
     * @dev Combines Comet authorization via EIP-712 signature with collateral swap execution.
     *      This allows users to authorize the contract and execute a swap atomically,
     *      eliminating the need for a separate approve transaction.
     *
     *      The function first validates and applies the signature-based authorization,
     *      then proceeds with the same swap logic as the regular swap function.
     *
     * @param swapParams The complete parameter struct defining the swap operation
     * @param allowParams The EIP-712 signature parameters for Comet authorization
     *
     * Requirements:
     * - All requirements from swap() function
     * - allowParams.owner must equal msg.sender
     * - allowParams.manager must equal this contract address
     * - allowParams.isAllowed must be true
     * - The signature must be valid and not expired
     * - The nonce must match the user's current nonce in Comet
     *
     * @custom:security Validates signature authorization before swap execution
     * @custom:security Prevents replay attacks using nonce validation
     * @custom:security Ensures only the signer can use their own signature
     */
    function swapWithPermit(SwapParams calldata swapParams, AllowBySig.AllowParams calldata allowParams) external;
}
