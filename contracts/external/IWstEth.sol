pragma solidity ^0.8.30;

interface IWstEth {
    function wrap(uint256 _stEthAmount) external returns (uint256);

    function unwrap(uint256 _wstEthAmount) external returns (uint256);

    function stEthPerToken() external view returns (uint256);
}
