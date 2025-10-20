// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FakeInvalidPlugin {
    bytes4 public constant CALLBACK_SELECTOR = 0x00000000;
}
