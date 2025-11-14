# Solidity API

## OKXPlugin

Swap plugin for integrating OKX DEX aggregator with CometMultiplier

_Implements ICometSwapPlugin interface for OKX dagSwap routing_

### SWAP_SELECTOR

```solidity
bytes4 SWAP_SELECTOR
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

### \_decodeSwapData

```solidity
function _decodeSwapData(bytes swapData) internal view returns (address receiver, struct IOKX.BaseRequest baseRequest, struct IOKX.RouterPath[] paths)
```

Decodes the swapData for OKX dagSwap

#### Parameters

| Name     | Type  | Description                    |
| -------- | ----- | ------------------------------ |
| swapData | bytes | Encoded swap data from OKX API |

#### Return Values

| Name        | Type                     | Description                             |
| ----------- | ------------------------ | --------------------------------------- |
| receiver    | address                  | Address to receive swapped tokens       |
| baseRequest | struct IOKX.BaseRequest  | Base request with token and amount info |
| paths       | struct IOKX.RouterPath[] | Array of routing paths                  |

### \_validateSwapParams

```solidity
function _validateSwapParams(address receiver, struct IOKX.BaseRequest baseRequest, struct IOKX.RouterPath[] paths, address srcToken, address dstToken, uint256 amountIn) internal view
```

Validates the swap parameters

#### Parameters

| Name        | Type                     | Description                             |
| ----------- | ------------------------ | --------------------------------------- |
| receiver    | address                  | Address to receive tokens               |
| baseRequest | struct IOKX.BaseRequest  | Base request with token and amount info |
| paths       | struct IOKX.RouterPath[] | Array of routing paths                  |
| srcToken    | address                  | Expected source token                   |
| dstToken    | address                  | Expected destination token              |
| amountIn    | uint256                  | Expected input amount                   |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
