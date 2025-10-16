// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICometFoundation {
    /**
     * @notice Options for flash loan and swap operations
     * @param comet The address of the Compound V3 Comet contract for this market
     * @param flp The address of the flash loan provider contract to use for borrowing assets
     * @param loanPlugin The address of the flash loan plugin contract
     * @param swapPlugin The address of the swap plugin contract
     */
    struct Options {
        address comet;
        address loanPlugin;
        address swapPlugin;
    }

    /**
     * @notice Parameters required to execute a collateral swap
     * @dev Contains all necessary information for the swap including assets, amounts, slippage protection, and swap routing
     * @param comet The address of the Compound V3 Comet contract for this market
     * @param flp The address of the flash loan provider contract to use for borrowing the target asset
     * @param fromAsset The address of the collateral asset to swap from (must be a valid Comet collateral)
     * @param toAsset The address of the collateral asset to swap to (must be a valid Comet collateral)
     * @param fromAmount The amount of fromAsset to swap (must be <= user's collateral balance)
     * @param minAmountOut The minimum amount of toAsset expected from the swap (slippage protection)
     * @param maxHealthFactorDropBps Maximum allowed drop in health factor in basis points (10000 = 100%)
     * @param callbackSelector The bytes4 selector identifying which flash loan plugin to use
     * @param swapCalldata The encoded calldata for the swap router to execute the asset exchange
     */
    struct SwapParams {
        Options opts;
        IERC20 fromAsset;
        IERC20 toAsset;
        uint256 fromAmount;
        uint256 minAmountOut;
        uint256 maxHealthFactorDropBps;
        bytes swapCalldata;
    }

    /**
     * @notice Data structure for flash loan callback parameters
     * @param debt The amount of debt to be repaid
     * @param fee The fee associated with the flash loan
     * @param snapshot A unique identifier for the flash loan operation
     * @param user The address of the user initiating the flash loan
     * @param flp The address of the flash loan provider
     * @param asset The address of the asset being borrowed
     * @param swapData Encoded data for executing a swap if needed
     * @dev This struct is used to pass necessary information during the flash loan callback
     *      and must be encoded/decoded appropriately.
     */
    struct CallbackData {
        uint256 debt;
        uint256 fee;
        address flp;
        IERC20 asset;
        bytes swapData;
    }

    /**
     * @notice Data structure for registered plugins
     * @param endpoint The address of the plugin contract
     * @param config Encoded configuration specific to the plugin
     * @dev Each plugin is identified by a unique key derived from its endpoint and callback selector
     *      and stored in the plugins mapping in the CometFoundation contract.
     */
    struct Plugin {
        address endpoint;
        bytes config;
    }

    /// @notice Token to pool mapping entry for UniswapV3Plugin
    struct Pool {
        address token;
        address pool;
    }

    /// @notice Operation modes for the multiplier adapter
    enum Mode {
        EXECUTE,
        WITHDRAW
    }

    /// @notice Parameters for gasless approvals using EIP-2612 signatures
    struct AllowParams {
        uint256 nonce;
        uint256 expiry;
        bytes32 r;
        bytes32 s;
        uint8 v;
    }
}
