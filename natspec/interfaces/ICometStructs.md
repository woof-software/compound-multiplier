# Solidity API

## ICometStructs

### Options

Options for flash loan and swap operations

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Options {
  contract IComet comet;
  address loanPlugin;
  address swapPlugin;
}
```

### SwapParams

Parameters required to execute a collateral swap

_Contains all necessary information for the swap including assets, amounts, slippage protection, and swap routing_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct SwapParams {
  struct ICometStructs.Options opts;
  contract IERC20 fromAsset;
  contract IERC20 toAsset;
  uint256 fromAmount;
  uint256 minAmountOut;
  uint256 maxHealthFactorDrop;
  bytes swapCalldata;
}
```

### CallbackData

Data structure for flash loan callback parameters

_This struct is used to pass necessary information during the flash loan callback
and must be encoded/decoded appropriately._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct CallbackData {
  uint256 debt;
  uint256 fee;
  address flp;
  contract IERC20 asset;
  bytes swapData;
}
```

### ProcessParams

Processing parameters for internal operations

_This struct is used internally to pass around operation parameters
and avoid stack depth issues._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct ProcessParams {
  contract IERC20 supplyAsset;
  uint256 supplyAmount;
  contract IERC20 withdrawAsset;
  uint256 withdrawAmount;
}
```

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

### Pool

Token to pool mapping entry for UniswapV3Plugin

```solidity
struct Pool {
  address token;
  address pool;
}
```

### Mode

Operation modes for the multiplier adapter

```solidity
enum Mode {
  MULTIPLY,
  COVER,
  EXCHANGE
}
```

### AllowParams

Parameters for gasless approvals using EIP-2612 signatures

```solidity
struct AllowParams {
  uint256 nonce;
  uint256 expiry;
  bytes32 r;
  bytes32 s;
  uint8 v;
}
```
