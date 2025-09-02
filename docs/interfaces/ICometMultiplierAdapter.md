# Solidity API

## ICometMultiplierAdapter

### UnsupportedAsset

```solidity
error UnsupportedAsset()
```

### UnsupportedPriceFeed

```solidity
error UnsupportedPriceFeed()
```

### UnknownCallbackSelector

```solidity
error UnknownCallbackSelector()
```

### UnknownSwapPlugin

```solidity
error UnknownSwapPlugin()
```

### UnknownMarket

```solidity
error UnknownMarket()
```

### InvalidPluginSelector

```solidity
error InvalidPluginSelector()
```

### InvalidLeverage

```solidity
error InvalidLeverage()
```

### CallbackFailed

```solidity
error CallbackFailed()
```

### FlashLoanFailed

```solidity
error FlashLoanFailed()
```

### InsufficiantAmountOut

```solidity
error InsufficiantAmountOut()
```

### InvalidMode

```solidity
error InvalidMode()
```

### AlreadyExists

```solidity
error AlreadyExists()
```

### NothingToDeleverage

```solidity
error NothingToDeleverage()
```

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### Mode

```solidity
enum Mode {
  EXECUTE,
  WITHDRAW
}
```

### Plugin

```solidity
struct Plugin {
  address endpoint;
  bytes config;
}
```

### Asset

```solidity
struct Asset {
  address flp;
  bytes4 loanSelector;
  bytes4 swapSelector;
}
```

### executeMultiplier

```solidity
function executeMultiplier(address market, address collateralAsset, uint256 initialAmount, uint256 leverage, bytes swapData, uint256 minAmountOut) external
```

### AssetAdded

```solidity
event AssetAdded(address collateralAsset, bytes4 pluginSelector)
```

### PluginAdded

```solidity
event PluginAdded(address plugin, bytes4 pluginSelector)
```

