# Solidity API

## ICompoundV3CollateralSwap

### Plugin

```solidity
struct Plugin {
  address endpoint;
  address flp;
}
```

### SwapParams

```solidity
struct SwapParams {
  address user;
  address comet;
  bytes4 callbackSelector;
  address fromAsset;
  uint256 fromAmount;
  address toAsset;
  bytes swapCalldata;
  uint256 minAmountOut;
  uint256 maxHealthFactorDropBps;
}
```

### PluginRegistered

```solidity
event PluginRegistered(bytes4 callbackSelector, address pluginEndpoint, address flp)
```

### UnauthorizedCallback

```solidity
error UnauthorizedCallback()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### UnknownPlugin

```solidity
error UnknownPlugin()
```

### NotSufficientLiquidity

```solidity
error NotSufficientLiquidity()
```

### UnknownCallbackSelector

```solidity
error UnknownCallbackSelector()
```

### FlashLoanFailed

```solidity
error FlashLoanFailed()
```

### InsufficientAmountOut

```solidity
error InsufficientAmountOut()
```

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### ZeroLength

```solidity
error ZeroLength()
```

### swapRouter

```solidity
function swapRouter() external view returns (address)
```

### swap

```solidity
function swap(struct ICompoundV3CollateralSwap.SwapParams swapParams) external
```

