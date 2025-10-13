# Solidity API

## ICometFoundation

### UnknownPlugin

```solidity
error UnknownPlugin()
```

### InvalidOpts

```solidity
error InvalidOpts()
```

### InvalidAsset

```solidity
error InvalidAsset()
```

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### PluginAdded

```solidity
event PluginAdded(address endpoint, bytes4 selector, bytes32 key)
```

Emitted when a new plugin is added to the registry

#### Parameters

| Name     | Type    | Description                                                   |
| -------- | ------- | ------------------------------------------------------------- |
| endpoint | address | The address of the plugin contract                            |
| selector | bytes4  | The unique bytes4 selector for the plugin's callback function |
| key      | bytes32 | The unique key derived from the endpoint and selector         |

### Plugin

Data structure for registered plugins

_Each plugin is identified by a unique key derived from its endpoint and callback selector
and stored in the plugins mapping in the CometFoundation contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Plugin {
  address endpoint;
  bytes config;
}
```

### Options

Options for flash loan and swap operations

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Options {
  address comet;
  address flp;
  address loanPlugin;
  address swapPlugin;
}
```
