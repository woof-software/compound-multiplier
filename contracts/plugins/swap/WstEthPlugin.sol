// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";
import { ICometMultiplierAdapter } from "../../interfaces/ICometMultiplierAdapter.sol";

import { IWstEth } from "../../external/lido/IWstEth.sol";
import { IStEth } from "../../external/lido/IStEth.sol";
import { IWEth } from "../../external/IWEth.sol";

/**
 * @title WstEthPlugin
 * @notice Swap plugin for converting between WETH and wstETH via Lido staking
 * @dev Implements ICometSwapPlugin interface to provide specialized WETH / wstETH conversion
 */
contract WstEthPlugin is ICometSwapPlugin {
    /// @notice Callback function selector for this swap plugin
    /// @dev Used by CometMultiplierAdapter to identify and route swap calls to this plugin
    bytes4 public constant CALLBACK_SELECTOR = 0x77aa7e1b;

    /// @notice Address of the wstETH token contract
    address public constant WSTETH_ADDRESS = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;

    /// @notice Address of the stETH token contract
    address public constant STETH_ADDRESS = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;

    /**
     * @inheritdoc ICometSwapPlugin
     */
    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata,
        bytes calldata
    ) external returns (uint256 amountOut) {
        require(srcToken != dstToken && amountIn > 0 && minAmountOut > 0, InvaildInput());
        address wEth = ICometMultiplierAdapter(address(this)).wEth();

        require(srcToken == wEth && dstToken == WSTETH_ADDRESS, InvaildInput());
        return _lidoSwap(wEth, WSTETH_ADDRESS, STETH_ADDRESS, amountIn, minAmountOut);
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
