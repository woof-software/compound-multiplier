// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";
import { IOKX } from "../../external/okx/IOKX.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title OKXPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Swap plugin for integrating OKX DEX aggregator with CometMultiplier
 * @dev Implements ICometSwapPlugin interface for OKX dagSwap routing
 */
contract OKXPlugin is ICometSwapPlugin {
    using SafeERC20 for IERC20;

    bytes4 public constant SWAP_SELECTOR = IOKX.dagSwapTo.selector;

    /**
     * @inheritdoc ICometSwapPlugin
     */
    function swap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(srcToken != address(0) && dstToken != address(0) && srcToken != dstToken, ICA.InvalidTokens());
        require(amountIn > 0, ICA.InvalidAmountIn());

        (address receiver, uint256 minAmountOut, IOKX.RouterPath[] memory paths) = _decodeSwapData(swapData);

        _validateSwapParams(receiver, paths, srcToken, dstToken, amountIn, minAmountOut);

        address router = abi.decode(config, (address));
        IERC20(srcToken).safeIncreaseAllowance(router, amountIn);

        uint256 balBefore = IERC20(dstToken).balanceOf(address(this));

        (bool ok, ) = router.call(swapData);
        if (!ok) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }

        amountOut = IERC20(dstToken).balanceOf(address(this)) - balBefore;
        require(amountOut >= minAmountOut, ICA.InvalidAmountOut());

        emit ICE.Swap(router, srcToken, dstToken, amountOut);
    }

    /**
     * @notice Decodes the swapData for OKX dagSwap
     * @param swapData Encoded swap data from OKX API
     * @return receiver Address to receive swapped tokens
     * @return minAmountOut Minimum amount expected from swap
     * @return paths Array of routing paths
     */
    function _decodeSwapData(
        bytes calldata swapData
    ) internal pure returns (address receiver, uint256 minAmountOut, IOKX.RouterPath[] memory paths) {
        require(swapData.length > 4, ICA.InvalidSwapParameters());
        require(bytes4(swapData[:4]) == SWAP_SELECTOR, ICA.InvalidSelector());
        IOKX.BaseRequest memory baseRequest;
        (, receiver, baseRequest, paths) = abi.decode(
            swapData[4:],
            (uint256, address, IOKX.BaseRequest, IOKX.RouterPath[])
        );

        minAmountOut = baseRequest.minReturnAmount;
    }

    /**
     * @notice Validates the swap parameters
     * @param receiver Address to receive tokens
     * @param paths Array of routing paths
     * @param srcToken Expected source token
     * @param dstToken Expected destination token
     * @param amount Expected input amount
     * @param minAmountOut Minimum expected output amount
     */
    function _validateSwapParams(
        address receiver,
        IOKX.RouterPath[] memory paths,
        address srcToken,
        address dstToken,
        uint256 amount,
        uint256 minAmountOut
    ) internal view {
        require(receiver == address(this), ICA.InvalidReceiver());
        require(paths.length != 0 && minAmountOut != 0, ICA.InvalidSwapParameters());

        require(paths.length > 0, ICA.InvalidSwapParameters());

        address fromToken = address(uint160((paths[0].fromToken)));
        require(fromToken == srcToken, ICA.InvalidTokens());
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
