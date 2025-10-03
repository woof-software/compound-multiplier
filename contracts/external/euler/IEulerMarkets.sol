pragma solidity ^0.8.30;

interface IEulerMarkets {
    function underlyingToDToken(address token) external view returns (address);
}
