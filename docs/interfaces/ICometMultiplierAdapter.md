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
  uint256 leverage;
  address flp;
  bytes4 pluginSelector;
}
```

### executeMultiplier

```solidity
function executeMultiplier(address baseAsset, address collateralAsset, uint256 initialAmount, uint256 leverage, bytes swapData, uint256 minAmountOut) external
```

### AssetAdded

```solidity
event AssetAdded(address market, address collateralAsset, bytes4 pluginSelector)
```

### PluginAdded

```solidity
event PluginAdded(address plugin, bytes4 pluginSelector)
```

