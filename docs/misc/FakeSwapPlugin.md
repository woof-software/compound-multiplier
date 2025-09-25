# Solidity API

## FakeSwapPlugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

### WHALE

```solidity
address WHALE
```

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes, bytes swapData) external returns (uint256 amountOut)
```

