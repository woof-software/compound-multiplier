# Solidity API

## OneInchV6SwapPlugin

Swap plugin for integrating 1inch V6 aggregator with CometMultiplierAdapter

_Implements ICometSwapPlugin interface to provide standardized token swap functionality
     using the 1inch V6 aggregation router for optimal swap execution_

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback function selector for this swap plugin

_Used by CometMultiplierAdapter to identify and route swap calls to this plugin_

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes config, bytes swapData) external returns (uint256 amountOut)
```

Executes a token swap using 1inch V6 aggregator

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| srcToken | address | Address of the source token to swap from |
| dstToken | address | Address of the destination token to swap to (unused) |
| amountIn | uint256 | Amount of source tokens to swap |
| minAmountOut | uint256 | Minimum amount of destination tokens expected |
| config | bytes | Encoded configuration containing the 1inch router address |
| swapData | bytes | Encoded swap parameters for the 1inch router call |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | Actual amount of destination tokens received from the swap |

