// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

interface IEulerDToken {
    function flashLoan(uint256 amount, bytes calldata data) external;

    function eVault() external view returns (address);
}
