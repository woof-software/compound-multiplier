pragma solidity =0.8.30;

interface IStEth {
    function submit(address _referral) external payable returns (uint256);
}
