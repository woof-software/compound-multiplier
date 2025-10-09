// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";

/**
 * @title OneInchV6SwapPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Swap plugin for integrating 1inch V6 aggregator with CometMultiplierAdapter
 * @dev Implements ICometSwapPlugin interface to provide standardized token swap functionality
 *      using the 1inch V6 aggregation router for optimal swap execution
 */
contract OneInchV6SwapPlugin is ICometSwapPlugin {
    using SafeERC20 for IERC20;

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
        require(minAmountOut > 0, InvalidInput());
        require(amountIn > 0, InvalidInput());
        require(srcToken != dstToken, InvalidInput());
        require(srcToken != address(0) && dstToken != address(0), ZeroAddress());

        address router = abi.decode(config, (address));
        IERC20(srcToken).safeIncreaseAllowance(router, amountIn);

        (bool ok, bytes memory ret) = router.call(swapData);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }

        (amountOut, ) = abi.decode(ret, (uint256, uint256));

        emit SwapExecuted(router, srcToken, dstToken, amountOut);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
