# Solidity API

## ILiFiPlugin

### SwapExecuted

```solidity
event SwapExecuted(address router, address srcToken, address dstToken, uint256 actualAmountOut)
```

### SwapFailed

```solidity
error SwapFailed()
```

### InsufficientOutputAmount

```solidity
error InsufficientOutputAmount()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### InvalidSwapParameters

```solidity
error InvalidSwapParameters()
```

### executeSwap

```solidity
function executeSwap(address router, address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes swapData) external
```
