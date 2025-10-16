# Solidity API

## ICometEvents

_This interface defines events emitted by the Comet protocol for various actions such as supply, withdraw, transfer, and more._

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

### MultiplierExecuted

```solidity
event MultiplierExecuted(address user, address comet, address collateral, uint256 multipliedAmount, uint256 debt)
```

Emitted when a leveraged position is executed or withdrawn

#### Parameters

| Name             | Type    | Description                                          |
| ---------------- | ------- | ---------------------------------------------------- |
| user             | address | The address of the user performing the operation     |
| comet            | address | The address of the Compound V3 Comet market          |
| collateral       | address | The address of the collateral asset involved         |
| multipliedAmount | uint256 | The total amount of collateral supplied or withdrawn |
| debt             | uint256 | The amount of debt borrowed or repaid                |

### MultiplierWithdrawn

```solidity
event MultiplierWithdrawn(address user, address comet, address collateral, uint256 withdrawnAmount, uint256 amountOut)
```

Emitted when collateral is withdrawn from a leveraged position

#### Parameters

| Name            | Type    | Description                                                       |
| --------------- | ------- | ----------------------------------------------------------------- |
| user            | address | The address of the user performing the withdrawal                 |
| comet           | address | The address of the Compound V3 Comet market                       |
| collateral      | address | The address of the collateral asset withdrawn                     |
| withdrawnAmount | uint256 | The amount of collateral tokens withdrawn                         |
| amountOut       | uint256 | The amount of base asset returned to the user after repaying debt |

### SwapExecuted

```solidity
event SwapExecuted(address comet, address fromAsset, address toAsset, uint256 fromAmount, uint256 amountOut)
```

Emitted when a collateral swap is executed

#### Parameters

| Name       | Type    | Description                                      |
| ---------- | ------- | ------------------------------------------------ |
| comet      | address | The address of the Compound V3 Comet market      |
| fromAsset  | address | The address of the collateral asset swapped from |
| toAsset    | address | The address of the collateral asset swapped to   |
| fromAmount | uint256 | The amount of fromAsset used in the swap         |
| amountOut  | uint256 | The amount of toAsset received from the swap     |

### Swap

```solidity
event Swap(address router, address srcToken, address dstToken, uint256 amountOut)
```

Emitted when a token swap is successfully executed

#### Parameters

| Name      | Type    | Description                                                    |
| --------- | ------- | -------------------------------------------------------------- |
| router    | address | The address of the router or contract used to perform the swap |
| srcToken  | address | Address of the source token swapped from                       |
| dstToken  | address | Address of the destination token swapped to                    |
| amountOut | uint256 | The actual amount of destination tokens received from the swap |

### FlashLoan

```solidity
event FlashLoan(address flp, address asset, uint256 amount, uint256 fee)
```

Emitted when a flash loan is taken

#### Parameters

| Name   | Type    | Description                            |
| ------ | ------- | -------------------------------------- |
| flp    | address | The address of the flash loan provider |
| asset  | address | The address of the asset borrowed      |
| amount | uint256 | The amount of the asset borrowed       |
| fee    | uint256 | The fee paid for the flash loan        |
