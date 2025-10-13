# Solidity API

## ICometSwapPlugin

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### InvalidInput

```solidity
error InvalidInput()
```

### ZeroAddress

```solidity
error ZeroAddress()
```

### InvalidSwapParameters

```solidity
error InvalidSwapParameters()
```

### SwapFailed

```solidity
error SwapFailed()
```

### SwapExecuted

```solidity
event SwapExecuted(address router, address srcToken, address dstToken, uint256 amountOut)
```

Emitted when a token swap is successfully executed

#### Parameters

| Name      | Type    | Description                                                    |
| --------- | ------- | -------------------------------------------------------------- |
| router    | address | The address of the router or contract used to perform the swap |
| srcToken  | address | Address of the source token swapped from                       |
| dstToken  | address | Address of the destination token swapped to                    |
| amountOut | uint256 | The actual amount of destination tokens received from the swap |

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes config, bytes swapData) external returns (uint256 amountOut)
```

Executes a token swap between two assets

#### Parameters

| Name         | Type    | Description                                            |
| ------------ | ------- | ------------------------------------------------------ |
| srcToken     | address | Address of the source token to swap from               |
| dstToken     | address | Address of the destination token to swap to            |
| amountIn     | uint256 | Amount of source tokens to swap                        |
| minAmountOut | uint256 | Minimum amount of destination tokens expected          |
| config       | bytes   | Encoded configuration specific to the swap plugin      |
| swapData     | bytes   | Encoded data required by the underlying swap mechanism |

#### Return Values

| Name      | Type    | Description                                                |
| --------- | ------- | ---------------------------------------------------------- |
| amountOut | uint256 | Actual amount of destination tokens received from the swap |
