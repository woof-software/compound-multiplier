# Solidity API

## IMorphoLiquidateCallback

Interface that liquidators willing to use `liquidate`'s callback must implement.

### onMorphoLiquidate

```solidity
function onMorphoLiquidate(uint256 repaidAssets, bytes data) external
```

Callback called when a liquidation occurs.

_The callback is called only if data is not empty._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| repaidAssets | uint256 | The amount of repaid assets. |
| data | bytes | Arbitrary data passed to the `liquidate` function. |

## IMorphoRepayCallback

Interface that users willing to use `repay`'s callback must implement.

### onMorphoRepay

```solidity
function onMorphoRepay(uint256 assets, bytes data) external
```

Callback called when a repayment occurs.

_The callback is called only if data is not empty._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The amount of repaid assets. |
| data | bytes | Arbitrary data passed to the `repay` function. |

## IMorphoSupplyCallback

Interface that users willing to use `supply`'s callback must implement.

### onMorphoSupply

```solidity
function onMorphoSupply(uint256 assets, bytes data) external
```

Callback called when a supply occurs.

_The callback is called only if data is not empty._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The amount of supplied assets. |
| data | bytes | Arbitrary data passed to the `supply` function. |

## IMorphoSupplyCollateralCallback

Interface that users willing to use `supplyCollateral`'s callback must implement.

### onMorphoSupplyCollateral

```solidity
function onMorphoSupplyCollateral(uint256 assets, bytes data) external
```

Callback called when a supply of collateral occurs.

_The callback is called only if data is not empty._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The amount of supplied collateral. |
| data | bytes | Arbitrary data passed to the `supplyCollateral` function. |

## IMorphoFlashLoanCallback

Interface that users willing to use `flashLoan`'s callback must implement.

### onMorphoFlashLoan

```solidity
function onMorphoFlashLoan(uint256 assets, bytes data) external
```

Callback called when a flash loan occurs.

_The callback is called only if data is not empty._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The amount of assets that was flash loaned. |
| data | bytes | Arbitrary data passed to the `flashLoan` function. |

