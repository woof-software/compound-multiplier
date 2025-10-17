# Solidity API

## ICometSwapPlugin

### SWAP_SELECTOR

```solidity
function SWAP_SELECTOR() external view returns (bytes4)
```

### swap

```solidity
function swap(address srcToken, address dstToken, uint256 amountIn, bytes config, bytes swapData) external returns (uint256 amountOut)
```

Executes a token swap between two assets

#### Parameters

| Name     | Type    | Description                                            |
| -------- | ------- | ------------------------------------------------------ |
| srcToken | address | Address of the source token to swap from               |
| dstToken | address | Address of the destination token to swap to            |
| amountIn | uint256 | Amount of source tokens to swap                        |
| config   | bytes   | Encoded configuration specific to the swap plugin      |
| swapData | bytes   | Encoded data required by the underlying swap mechanism |

#### Return Values

| Name      | Type    | Description                                                    |
| --------- | ------- | -------------------------------------------------------------- |
| amountOut | uint256 | The actual amount of destination tokens received from the swap |
