// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ISwapPlugin } from "../../interfaces/ISwapPlugin.sol";
import { IOneInchV6 } from "../../../external/oneinch/IOneInchV6.sol";

import { IAlerts as IA } from "../../interfaces/IAlerts.sol";
import { IEvents as IE } from "../../interfaces/IEvents.sol";

/**
 * @title OneInchV6SwapPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Swap plugin for integrating 1inch V6 aggregator with CometMultiplier
 * @dev Implements ISwapPlugin interface to provide standardized token swap functionality
 *      using the 1inch V6 aggregation router for optimal swap execution
 */
contract OneInchV6SwapPlugin is ISwapPlugin {
    using SafeERC20 for IERC20;

    bytes4 public constant SWAP_SELECTOR = IOneInchV6.swap.selector;

    /**
     * @inheritdoc ISwapPlugin
     */
    function swap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(srcToken != address(0) && dstToken != address(0) && srcToken != dstToken, IA.InvalidTokens());
        require(amountIn > 0, IA.InvalidAmountIn());

        IOneInchV6.SwapDescription memory desc = _decodeSwapData(swapData);

        _validateSwapParams(desc, srcToken, dstToken, amountIn);

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
        require(amountOut >= desc.minReturnAmount, IA.InvalidAmountOut());

        emit IE.Swap(router, srcToken, dstToken, amountOut);
    }

    /**
     * @notice Decodes swapData for 1inch V6 swap
     * @param swapData Encoded swap data from 1inch API
     * @return desc Swap description with all parameters
     */
    function _decodeSwapData(bytes calldata swapData) internal pure returns (IOneInchV6.SwapDescription memory desc) {
        // aderyn-fp-next-line(literal-instead-of-constant)
        require(swapData.length > 4, IA.InvalidSwapParameters());
        // aderyn-fp-next-line(literal-instead-of-constant)
        require(bytes4(swapData[:4]) == SWAP_SELECTOR, IA.InvalidSelector());
        (
            ,
            // address executor
            desc,

        ) = abi.decode(
                // aderyn-fp-next-line(literal-instead-of-constant)
                swapData[4:],
                (address, IOneInchV6.SwapDescription, bytes)
            );
    }

    /**
     * @notice Validates the swap parameters
     * @param desc Swap description from 1inch
     * @param srcToken Expected source token
     * @param dstToken Expected destination token
     * @param amount Expected swap amount
     */
    function _validateSwapParams(
        IOneInchV6.SwapDescription memory desc,
        address srcToken,
        address dstToken,
        uint256 amount
    ) internal view {
        require(address(desc.srcToken) == srcToken && address(desc.dstToken) == dstToken, IA.InvalidTokens());
        require(desc.dstReceiver == address(this), IA.InvalidReceiver());
        require(desc.amount == amount && desc.minReturnAmount != 0, IA.InvalidSwapParameters());
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ISwapPlugin).interfaceId;
    }
}
