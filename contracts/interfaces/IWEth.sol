pragma solidity ^0.8.30;

interface IWEth {
    function deposit() external payable;

    function withdraw(uint256) external;
}
