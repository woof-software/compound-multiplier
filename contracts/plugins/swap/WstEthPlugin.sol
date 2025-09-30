// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";
import { IWEth } from "../../external/IWEth.sol";
import { IWstEth } from "../../external/IWstEth.sol";
import { IStEth } from "../../external/IStEth.sol";
import { ICometMultiplierAdapter } from "../../interfaces/ICometMultiplierAdapter.sol";

/**
 * @title WstEthPlugin
 * @notice Swap plugin for converting between WETH and wstETH via Lido staking
 * @dev Implements ICometSwapPlugin interface to provide specialized WETH / wstETH conversion
 */
contract WstEthPlugin is ICometSwapPlugin {
    /// @notice Callback function selector for this swap plugin
    /// @dev Used by CometMultiplierAdapter to identify and route swap calls to this plugin
    bytes4 public constant CALLBACK_SELECTOR = 0x77aa7e1b;

    /**
     * @notice Allows the contract to receive ETH for staking operations
     * @dev Required for receiving ETH from WETH unwrapping and stETH withdrawals
     */
    receive() external payable {}

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
        require(srcToken != dstToken && amountIn > 0 && minAmountOut > 0, InvalidInput());

        address wEth = ICometMultiplierAdapter(address(this)).wEth();

        {
            (address wstEth, address stEth, , ) = abi.decode(config, (address, address, address, bytes));

            if (srcToken == wEth && dstToken == wstEth) {
                return _lidoSwap(wEth, wstEth, stEth, amountIn, minAmountOut);
            }
        }

        {
            (, , address swapPlugin, bytes memory _config) = abi.decode(config, (address, address, address, bytes));

            (bool ok, bytes memory ret) = swapPlugin.delegatecall(
                abi.encodeWithSelector(
                    ICometSwapPlugin.executeSwap.selector,
                    srcToken,
                    dstToken,
                    amountIn,
                    minAmountOut,
                    _config,
                    swapData
                )
            );
            if (!ok) {
                assembly {
                    revert(add(ret, 32), mload(ret))
                }
            }
            amountOut = abi.decode(ret, (uint256));

            emit SwapExecuted(swapPlugin, srcToken, dstToken, amountOut);
        }
    }

    function _lidoSwap(
        address wEth,
        address wstEth,
        address stEth,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        uint256 initial = IERC20(wstEth).balanceOf(address(this));
        IWEth(wEth).withdraw(amountIn);
        uint256 stAmount = IStEth(stEth).submit{ value: amountIn }(address(this));
        IERC20(stEth).approve(wstEth, stAmount);
        IWstEth(wstEth).wrap(stAmount);
        amountOut = IERC20(wstEth).balanceOf(address(this)) - initial;
        require(amountOut >= minAmountOut, InvalidAmountOut());
        emit SwapExecuted(wstEth, wEth, wstEth, amountOut);
    }
}
