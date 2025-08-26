// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAggregationExecutor {
    function callBytes(bytes calldata data) external payable;
}

interface IAggregationRouterV6 {
    struct SwapDescription {
        IERC20 srcToken;
        IERC20 dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    function swap(
        IAggregationExecutor caller,
        SwapDescription calldata desc,
        bytes calldata data
    ) external payable returns (uint256 returnAmount, uint256 spentAmount);

    function unoswap(
        address srcToken,
        uint256 amount,
        uint256 minReturn,
        uint256[] memory pools
    ) external payable returns (uint256 returnAmount);
}