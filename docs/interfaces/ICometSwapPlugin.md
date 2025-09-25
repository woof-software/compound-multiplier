# Solidity API

## ICometSwapPlugin

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### InvaildInput

```solidity
error InvaildInput()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### SwapExecuted

```solidity
event SwapExecuted(address router, address srcToken, address dstToken, uint256 amountOut)
```

### CALLBACK_SELECTOR

```solidity
function CALLBACK_SELECTOR() external view returns (bytes4)
```

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes config, bytes swapData) external returns (uint256 amountOut)
```

