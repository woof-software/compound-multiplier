// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";
import { IOneInchV6 } from "../../external/oneinch/IOneInchV6.sol";

import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title OneInchV6SwapPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Swap plugin for integrating 1inch V6 aggregator with CometMultiplier
 * @dev Implements ICometSwapPlugin interface to provide standardized token swap functionality
 *      using the 1inch V6 aggregation router for optimal swap execution
 */
contract OneInchV6SwapPlugin is ICometSwapPlugin {
    using SafeERC20 for IERC20;

    bytes4 public constant SWAP_SELECTOR = IOneInchV6.swap.selector;

    /**
     * @inheritdoc ICometSwapPlugin
     */
    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(srcToken != address(0) && dstToken != address(0) && srcToken != dstToken, ICA.InvalidTokens());
        require(amountIn > 0, ICA.InvalidAmountIn());

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
        require(amountOut >= desc.minReturnAmount, ICA.InvalidAmountOut());

        emit ICE.Swap(router, srcToken, dstToken, amountOut);
    }

    /**
     * @notice Decodes swapData for 1inch V6 swap
     * @param swapData Encoded swap data from 1inch API
     * @return desc Swap description with all parameters
     */
    function _decodeSwapData(bytes calldata swapData) internal pure returns (IOneInchV6.SwapDescription memory desc) {
        require(swapData.length > 4, ICA.InvalidSwapParameters());
        require(bytes4(swapData[:4]) == SWAP_SELECTOR, ICA.InvalidSelector());
        (
            ,
            // address executor
            desc,

        ) = // bytes memory data

            abi.decode(swapData[4:], (address, IOneInchV6.SwapDescription, bytes));
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
        require(address(desc.srcToken) == srcToken && address(desc.dstToken) == dstToken, ICA.InvalidTokens());
        require(desc.dstReceiver == address(this), ICA.InvalidReceiver());
        require(desc.amount == amount && desc.minReturnAmount != 0, ICA.InvalidSwapParameters());
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
