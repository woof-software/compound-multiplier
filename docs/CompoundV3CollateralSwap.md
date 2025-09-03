# Solidity API

## CompoundV3CollateralSwap

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
  address[] fromAssets;
  uint256[] fromAmounts;
  address[] toAssets;
  uint256[] flashLoanAmounts;
  bytes[] swapCalldata;
  uint256[] minAmountsOut;
  uint256 maxHealthFactorDropBps;
  address[] supplementalAssets;
  uint256[] supplementalAmounts;
}
```

### FACTOR_SCALE

```solidity
uint64 FACTOR_SCALE
```

_The scale for factors_

### BPS_DROP_DENOMINATOR

```solidity
uint16 BPS_DROP_DENOMINATOR
```

_The denominator for basis points (BPS), value declares 100%_

### plugins

```solidity
mapping(bytes4 => struct CompoundV3CollateralSwap.Plugin) plugins
```

Maps plugins callback selector to the plugin endpoint address

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

### constructor

```solidity
constructor(struct CompoundV3CollateralSwap.Plugin[] plugins_) public payable
```

### swap

```solidity
function swap(struct CompoundV3CollateralSwap.SwapParams swapParams) external
```

### swapWithApprove

```solidity
function swapWithApprove(struct CompoundV3CollateralSwap.SwapParams swapParams, struct AllowBySig.AllowParams allowParams) external
```

### _swap

```solidity
function _swap(struct CompoundV3CollateralSwap.SwapParams swapParams) internal
```

### fallback

```solidity
fallback() external payable
```

### receive

```solidity
receive() external payable
```

### _checkCollateralization

```solidity
function _checkCollateralization(contract IComet comet, address assetFrom, address assetTo, uint256 fromAmount, uint256 minAmountOut, uint256 maxHealthFactorDropBps) internal view returns (bool)
```

_Checks if the collateralization is sufficient for the swap._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | contract IComet | The Comet contract instance. |
| assetFrom | address | The address of the asset being swapped from. |
| assetTo | address | The address of the asset being swapped to. |
| fromAmount | uint256 | The amount of the asset being swapped from. |
| minAmountOut | uint256 | The minimum amount of the asset being swapped to. |
| maxHealthFactorDropBps | uint256 | The maximum allowed drop in health factor (in basis points). |

### _catch

```solidity
function _catch(bool success) internal pure
```

