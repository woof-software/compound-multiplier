# Solidity API

## WstEthPlugin

Swap plugin for converting between WETH and wstETH via Lido staking

_Implements ICometSwapPlugin interface to provide specialized WETH / wstETH conversion_

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback function selector for this swap plugin

_Used by CometMultiplierAdapter to identify and route swap calls to this plugin_

### WSTETH_ADDRESS

```solidity
address WSTETH_ADDRESS
```

Address of the wstETH token contract

### STETH_ADDRESS

```solidity
address STETH_ADDRESS
```

Address of the stETH token contract

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes, bytes) external returns (uint256 amountOut)
```

Executes a token swap between two assets

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| srcToken | address | Address of the source token to swap from |
| dstToken | address | Address of the destination token to swap to |
| amountIn | uint256 | Amount of source tokens to swap |
| minAmountOut | uint256 | Minimum amount of destination tokens expected |
|  | bytes |  |
|  | bytes |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | Actual amount of destination tokens received from the swap |

### _lidoSwap

```solidity
function _lidoSwap(address wEth, address wstEth, address stEth, uint256 amountIn, uint256 minAmountOut) internal returns (uint256 amountOut)
```

