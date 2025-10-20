// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";

import { ILiFi } from "../../external/lifi/ILiFi.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ICometStructs as ICS } from "../../interfaces/ICometStructs.sol";
import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title LiFiPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Swap plugin for integrating LiFi aggregator with CometMultiplier
 * @dev Implements ICometSwapPlugin interface to provide standardized token swap functionality
 *      using the LiFi aggregation router for optimal swap execution
 */
contract LiFiPlugin is ICometSwapPlugin {
    using SafeERC20 for IERC20;

    bytes4 public constant SWAP_SELECTOR = ILiFi.swapTokensMultipleV3ERC20ToERC20.selector;

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

        (address payable receiver, uint256 minAmountOut, ILiFi.SwapData[] memory swaps) = _decodeSwapData(swapData);

        _validateSwapParams(receiver, swaps, srcToken, dstToken, amountIn, minAmountOut);

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
     * @notice Decodes the swapData for LiFi swap
     * @param swapData Encoded swap data from LiFi API
     * @return receiver Address to receive swapped tokens
     * @return minAmountOut Minimum amount expected from swap
     * @return swaps Array of swap steps
     */
    function _decodeSwapData(
        bytes calldata swapData
    ) internal pure returns (address payable receiver, uint256 minAmountOut, ILiFi.SwapData[] memory swaps) {
        // aderyn-fp-next-line(magic-number)
        require(swapData.length > 4, ICA.InvalidSwapParameters());
        // aderyn-fp-next-line(magic-number)
        require(bytes4(swapData[:4]) == SWAP_SELECTOR, ICA.InvalidSelector());
        (
            ,
            ,
            ,
            // bytes32 transactionId
            // string memory integrator
            // string memory referrer
            receiver,
            minAmountOut,
            swaps
        ) = abi.decode(swapData[4:], (bytes32, string, string, address, uint256, ILiFi.SwapData[])); // aderyn-fp-next-line(magic-number)
    }

    /**
     * @notice Validates the swap parameters
     * @param receiver Address to receive tokens
     * @param minAmountOut Minimum expected output amount
     * @param swaps Array of swap steps
     * @param srcToken Expected source token
     * @param dstToken Expected destination token
     * @param amount Expected input amount
     */
    function _validateSwapParams(
        address receiver,
        ILiFi.SwapData[] memory swaps,
        address srcToken,
        address dstToken,
        uint256 amount,
        uint256 minAmountOut
    ) internal view {
        require(receiver == address(this), ICA.InvalidReceiver());
        require(swaps.length != 0 && swaps[0].fromAmount == amount && minAmountOut != 0, ICA.InvalidSwapParameters());
        require(
            swaps[0].sendingAssetId == srcToken && swaps[swaps.length - 1].receivingAssetId == dstToken,
            ICA.InvalidTokens()
        );
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
