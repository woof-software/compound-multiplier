// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometSwapPlugin } from "../interfaces/ICometSwapPlugin.sol";

error InvalidAmountOut();
error IvaildInput();

contract OneInchV6SwapPlugin is ICometSwapPlugin {
    bytes4 public constant CALLBACK_SELECTOR = 0x8b9d1a3c;

    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(srcToken != dstToken && amountIn > 0 && minAmountOut > 0, IvaildInput());

        address router = abi.decode(config, (address));

        IERC20(srcToken).approve(router, amountIn);
        (bool ok, bytes memory ret) = router.call(swapData);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }

        (uint256 returnAmount, ) = abi.decode(ret, (uint256, uint256));
        require(returnAmount >= minAmountOut, InvalidAmountOut());

        amountOut = returnAmount;
    }
}
