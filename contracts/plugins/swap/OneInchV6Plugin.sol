// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";

/**
 * @title OneInchV6SwapPlugin
 * @author WOOF!
 * @notice Swap plugin for integrating 1inch V6 aggregator with CometMultiplierAdapter
 * @dev Implements ICometSwapPlugin interface to provide standardized token swap functionality
 *      using the 1inch V6 aggregation router for optimal swap execution
 */
contract OneInchV6SwapPlugin is ICometSwapPlugin {
    /// @notice Callback function selector for this swap plugin
    /// @dev Used by CometMultiplierAdapter to identify and route swap calls to this plugin
    bytes4 public constant CALLBACK_SELECTOR = 0x7a8c0f2b;

    /**
     * @notice Executes a token swap using 1inch V6 aggregator
     * @param srcToken Address of the source token to swap from
     * @param dstToken Address of the destination token to swap to (unused)
     * @param amountIn Amount of source tokens to swap
     * @param minAmountOut Minimum amount of destination tokens expected
     * @param config Encoded configuration containing the 1inch router address
     * @param swapData Encoded swap parameters for the 1inch router call
     * @return amountOut Actual amount of destination tokens received from the swap
     * @custom:security Uses low-level call with proper error propagation to handle router failures
     */
    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(minAmountOut > 0, InvaildInput());
        require(amountIn > 0, InvaildInput());
        require(srcToken != dstToken, InvaildInput());
        require(srcToken != address(0) && dstToken != address(0), ZeroAddress());

        address router = abi.decode(config, (address));
        IERC20(srcToken).approve(router, amountIn);

        (bool ok, bytes memory ret) = router.call(swapData);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }

        (amountOut, ) = abi.decode(ret, (uint256, uint256));

        emit SwapExecuted(router, srcToken, dstToken, amountOut);
    }
}
