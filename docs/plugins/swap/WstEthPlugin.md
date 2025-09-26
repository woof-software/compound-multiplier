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

### receive

```solidity
receive() external payable
```

Allows the contract to receive ETH for staking operations

_Required for receiving ETH from WETH unwrapping and stETH withdrawals_

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes config, bytes swapData) external returns (uint256 amountOut)
```

Executes a token swap between two assets

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| srcToken | address | Address of the source token to swap from |
| dstToken | address | Address of the destination token to swap to |
| amountIn | uint256 | Amount of source tokens to swap |
| minAmountOut | uint256 | Minimum amount of destination tokens expected |
| config | bytes | Encoded configuration specific to the swap plugin |
| swapData | bytes | Encoded data required by the underlying swap mechanism |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | Actual amount of destination tokens received from the swap |

### _lidoSwap

```solidity
function _lidoSwap(address wEth, address wstEth, address stEth, uint256 amountIn, uint256 minAmountOut) internal returns (uint256 amountOut)
```

