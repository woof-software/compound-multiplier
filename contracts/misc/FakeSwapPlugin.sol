// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometSwapPlugin } from "../interfaces/ICometSwapPlugin.sol";

contract FakeSwapPlugin is ICometSwapPlugin {
    bytes4 public constant SWAP_SELECTOR = 0x9b9d1a3d;

    address constant WHALE = 0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341;

    function executeSwap(
        address srcToken,
        address,
        uint256 amountIn,
        bytes calldata,
        bytes calldata
    ) external returns (uint256 amountOut) {
        uint256 allowance = IERC20(srcToken).allowance(WHALE, address(this));
        if (allowance >= amountIn) {
            IERC20(srcToken).transferFrom(WHALE, address(this), amountIn);
        }
        return 0;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
