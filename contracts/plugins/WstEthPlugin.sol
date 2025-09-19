// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometSwapPlugin } from "../interfaces/ICometSwapPlugin.sol";
import { IWEth } from "../interfaces/IWEth.sol";
import { IWstEth } from "../interfaces/IWstEth.sol";
import { IStEth } from "../interfaces/IStEth.sol";

contract WstEthPlugin is ICometSwapPlugin {
    bytes4 public constant CALLBACK_SELECTOR = 0x77aa7e1b;

    receive() external payable {}

    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata config,
        bytes calldata
    ) external returns (uint256 amountOut) {
        require(srcToken != dstToken && amountIn > 0 && minAmountOut > 0, IvaildInput());

        (address wEth, address wstEth, address stEth) = abi.decode(config, (address, address, address));

        if (srcToken == wEth && dstToken == wstEth) {
            IWEth(wEth).withdraw(amountIn);
            uint256 stEthAmount = IStEth(stEth).submit{ value: amountIn }(address(this));
            IERC20(stEth).approve(wstEth, stEthAmount);
            IWstEth(wstEth).wrap(stEthAmount);
            uint256 wstBal = IERC20(wstEth).balanceOf(address(this));
            require(wstBal >= minAmountOut, InvalidAmountOut());
            return wstBal;
        } else if (srcToken == wstEth && dstToken == wEth) {
            IERC20(wstEth).approve(wstEth, amountIn);
            IWstEth(wstEth).unwrap(amountIn);
            uint256 stEthBalance = IERC20(stEth).balanceOf(address(this));
            IStEth(stEth).withdraw(stEthBalance, address(this));
            uint256 ethOut = address(this).balance;
            IWEth(wEth).deposit{ value: ethOut }();
            require(ethOut >= minAmountOut, InvalidAmountOut());
            return ethOut;
        } else {
            revert IvaildInput();
        }
    }
}
