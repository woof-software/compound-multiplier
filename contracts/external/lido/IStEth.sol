pragma solidity ^0.8.30;

interface IStEth {
    function submit(address _referral) external payable returns (uint256);

    function withdraw(uint256 _amount, address _recipient) external;
}
