// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ICometSwapPlugin } from "../interfaces/ICometSwapPlugin.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiFiPlugin is ICometSwapPlugin {
    bytes4 public constant CALLBACK_SELECTOR = 0x8b9d1a3c;

    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(srcToken != address(0) && dstToken != address(0), ZeroAddress());
        require(srcToken != dstToken, InvalidSwapParameters());
        require(amountIn > 0, InvalidSwapParameters());
        require(minAmountOut > 0, InvalidSwapParameters());

        address router = abi.decode(config, (address));

        IERC20(srcToken).approve(router, amountIn);

        uint256 balBefore = IERC20(dstToken).balanceOf(address(this));

        (bool ok, ) = router.call(swapData);
        if (!ok) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }

        uint256 balAfter = IERC20(dstToken).balanceOf(address(this));
        amountOut = balAfter - balBefore;

        require(amountOut >= minAmountOut, InvalidAmountOut());

        emit SwapExecuted(router, srcToken, dstToken, amountOut);
    }
}
