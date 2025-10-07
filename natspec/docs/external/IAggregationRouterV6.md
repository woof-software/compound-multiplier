# Solidity API

## IAggregationExecutor

### callBytes

```solidity
function callBytes(bytes data) external payable
```

## IAggregationRouterV6

### SwapDescription

```solidity
struct SwapDescription {
  contract IERC20 srcToken;
  contract IERC20 dstToken;
  address srcReceiver;
  address dstReceiver;
  uint256 amount;
  uint256 minReturnAmount;
  uint256 flags;
}
```

### swap

```solidity
function swap(contract IAggregationExecutor caller, struct IAggregationRouterV6.SwapDescription desc, bytes data) external payable returns (uint256 returnAmount, uint256 spentAmount)
```

### unoswap

```solidity
function unoswap(address srcToken, uint256 amount, uint256 minReturn, uint256[] pools) external payable returns (uint256 returnAmount)
```
