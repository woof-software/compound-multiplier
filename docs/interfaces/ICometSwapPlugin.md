# Solidity API

## ICometSwapPlugin

### SwapExecuted

```solidity
event SwapExecuted(address router, address srcToken, address dstToken, uint256 actualAmountOut)
```

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### InvalidInput

```solidity
error InvalidInput()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### InvalidSwapParameters

```solidity
error InvalidSwapParameters()
```

### SwapFailed

```solidity
error SwapFailed()
```

### CALLBACK_SELECTOR

```solidity
function CALLBACK_SELECTOR() external view returns (bytes4)
```

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes config, bytes swapData) external returns (uint256 amountOut)
```

