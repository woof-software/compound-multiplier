// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IUniswapV3Pool {
    function flash(address recipient, uint256 amount0, uint256 amount1, bytes calldata data) external;

    function token0() external view returns (address);

    function token1() external view returns (address);

    function fee() external view returns (uint24);
}
