# Solidity API

## ICometMultiplierAdapter

### UnsupportedPriceFeed

```solidity
error UnsupportedPriceFeed()
```

### UnknownCallbackSelector

```solidity
error UnknownCallbackSelector()
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

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### InvalidAsset

```solidity
error InvalidAsset()
```

### CallbackFailed

```solidity
error CallbackFailed()
```

### FlashLoanFailed

```solidity
error FlashLoanFailed()
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

### Options

```solidity
struct Options {
  address market;
  address flp;
  bytes4 loanSelector;
  bytes4 swapSelector;
}
```

### AssetAdded

```solidity
event AssetAdded(address collateralAsset, bytes4 pluginSelector)
```

### PluginAdded

```solidity
event PluginAdded(address plugin, bytes4 pluginSelector)
```

