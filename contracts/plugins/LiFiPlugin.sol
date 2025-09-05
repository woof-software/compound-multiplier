// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ILiFiPlugin } from "../interfaces/ILiFiPlugin.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiFiPlugin is ILiFiPlugin {
    function executeSwap(
        address router,
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external {
        require(srcToken != address(0) && dstToken != address(0), ZeroAddress());
        require(srcToken != dstToken, InvalidSwapParameters());
        require(amountIn > 0, InvalidSwapParameters());
        require(minAmountOut > 0, InvalidSwapParameters());

        IERC20(srcToken).approve(router, amountIn);

        uint256 balBefore = IERC20(dstToken).balanceOf(address(this));

        (bool ok, ) = router.call(swapData);
        require(ok, SwapFailed());

        uint256 balAfter = IERC20(dstToken).balanceOf(address(this));
        uint256 actualAmountOut = balAfter - balBefore;

        require(actualAmountOut >= minAmountOut, InsufficientOutputAmount());

        emit SwapExecuted(router, srcToken, dstToken, actualAmountOut);
    }
}
