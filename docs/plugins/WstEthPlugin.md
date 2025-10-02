# Solidity API

## WstEthPlugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

### receive

```solidity
receive() external payable
```

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes config, bytes) external returns (uint256 amountOut)
```

