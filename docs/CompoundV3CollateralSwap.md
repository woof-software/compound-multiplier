# Solidity API

## CompoundV3CollateralSwap

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

### SLOT_ADAPTER

```solidity
bytes32 SLOT_ADAPTER
```

### swapRouter

```solidity
address swapRouter
```

### plugins

```solidity
mapping(bytes4 => struct ICompoundV3CollateralSwap.Plugin) plugins
```

Maps plugins callback selector to the plugin endpoint address

### constructor

```solidity
constructor(struct ICompoundV3CollateralSwap.Plugin[] plugins_, address swapRouter_) public
```

### receive

```solidity
receive() external payable
```

### fallback

```solidity
fallback() external payable
```

### swap

```solidity
function swap(struct ICompoundV3CollateralSwap.SwapParams swapParams) external
```

### swapWithApprove

```solidity
function swapWithApprove(struct ICompoundV3CollateralSwap.SwapParams swapParams, struct AllowBySig.AllowParams allowParams) external
```

### _swap

```solidity
function _swap(struct ICompoundV3CollateralSwap.SwapParams swapParams) internal
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

### _tstore

```solidity
function _tstore(address comet, address fromAsset, uint256 fromAmount) internal
```

### _tload

```solidity
function _tload() internal returns (address comet, address fromAsset, uint256 fromAmount)
```

### _catch

```solidity
function _catch(bool success) internal pure
```

