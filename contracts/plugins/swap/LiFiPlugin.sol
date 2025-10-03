// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LiFiPlugin
 * @author WOOF!
 * @notice Swap plugin for integrating LiFi aggregator with CometMultiplierAdapter
 * @dev Implements ICometSwapPlugin interface to provide standardized token swap functionality
 *      using the LiFi aggregation router for optimal swap execution
 */
contract LiFiPlugin is ICometSwapPlugin {
    /// @notice Callback function selector for this swap plugin
    /// @dev Used by CometMultiplierAdapter to identify and route swap calls to this plugin
    bytes4 public constant CALLBACK_SELECTOR = 0x8b9d1a3c;

    /**
     * @inheritdoc ICometSwapPlugin
     */
    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(srcToken != address(0) && dstToken != address(0), ZeroAddress());
        require(srcToken != dstToken, InvalidInput());
        require(amountIn > 0, InvalidInput());
        require(minAmountOut > 0, InvalidInput());

        address router = abi.decode(config, (address));

        IERC20(srcToken).approve(router, amountIn);

        uint256 balBefore = IERC20(dstToken).balanceOf(address(this));

        (bool ok, ) = router.call(swapData);
        if (!ok) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }

        uint256 balAfter = IERC20(dstToken).balanceOf(address(this));
        amountOut = balAfter - balBefore;

        emit SwapExecuted(router, srcToken, dstToken, amountOut);
    }
}
