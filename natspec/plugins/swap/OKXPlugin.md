# Solidity API

## OKXPlugin

Swap plugin for integrating OKX DEX aggregator with CometMultiplier

_Implements ICometSwapPlugin interface for OKX dagSwap routing_

### SWAP_SELECTOR

```solidity
bytes4 SWAP_SELECTOR
```

### DAG_SWAP_SELECTOR

```solidity
bytes4 DAG_SWAP_SELECTOR
```

### DAG_SWAP_BY_ORDER_ID_SELECTOR

```solidity
bytes4 DAG_SWAP_BY_ORDER_ID_SELECTOR
```

### SMART_SWAP_TO_SELECTOR

```solidity
bytes4 SMART_SWAP_TO_SELECTOR
```

### SMART_SWAP_BY_ORDER_ID_SELECTOR

```solidity
bytes4 SMART_SWAP_BY_ORDER_ID_SELECTOR
```

### UNIV3_SWAP_SELECTOR

```solidity
bytes4 UNIV3_SWAP_SELECTOR
```

### UNIV3_SWAP_TO_WITH_BASE_REQUEST_SELECTOR

```solidity
bytes4 UNIV3_SWAP_TO_WITH_BASE_REQUEST_SELECTOR
```

### UNXSWAP_TO_SELECTOR

```solidity
bytes4 UNXSWAP_TO_SELECTOR
```

### UNXSWAP_BY_ORDER_ID_SELECTOR

```solidity
bytes4 UNXSWAP_BY_ORDER_ID_SELECTOR
```

### UNXSWAP_TO_WITH_BASE_REQUEST_SELECTOR

```solidity
bytes4 UNXSWAP_TO_WITH_BASE_REQUEST_SELECTOR
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

### \_decodeAndValidateSwapData

```solidity
function _decodeAndValidateSwapData(bytes4 selector, bytes swapData, address srcToken, address dstToken, uint256 amountIn, address self) internal pure returns (uint256 minReturnAmount)
```

Decodes and validates swap data based on the function selector

_Routes to the appropriate decoder/validator based on the selector_

#### Parameters

| Name     | Type    | Description                                        |
| -------- | ------- | -------------------------------------------------- |
| selector | bytes4  | Function selector from swapData                    |
| swapData | bytes   | Encoded swap data from OKX API                     |
| srcToken | address | Expected source token address                      |
| dstToken | address | Expected destination token address                 |
| amountIn | uint256 | Expected input amount                              |
| self     | address | Address of this contract (for receiver validation) |

#### Return Values

| Name            | Type    | Description                                   |
| --------------- | ------- | --------------------------------------------- |
| minReturnAmount | uint256 | Minimum return amount extracted from swapData |

### \_decodeAndValidateDagSwap

```solidity
function _decodeAndValidateDagSwap(bytes4 selector, bytes swapData, address srcToken, address dstToken, uint256 amountIn, address self) internal pure returns (uint256 minReturnAmount)
```

Decodes and validates DAG swap parameters

_Validates receiver, amounts, paths, and token addresses for DAG swaps_

#### Parameters

| Name     | Type    | Description                                                            |
| -------- | ------- | ---------------------------------------------------------------------- |
| selector | bytes4  | Function selector (DAG_SWAP_SELECTOR or DAG_SWAP_BY_ORDER_ID_SELECTOR) |
| swapData | bytes   | Encoded swap data from OKX API                                         |
| srcToken | address | Expected source token address                                          |
| dstToken | address | Expected destination token address                                     |
| amountIn | uint256 | Expected input amount                                                  |
| self     | address | Address of this contract (for receiver validation)                     |

#### Return Values

| Name            | Type    | Description                            |
| --------------- | ------- | -------------------------------------- |
| minReturnAmount | uint256 | Minimum return amount from baseRequest |

### \_decodeAndValidateSmartSwap

```solidity
function _decodeAndValidateSmartSwap(bytes4 selector, bytes swapData, uint256 amountIn, address self) internal pure returns (uint256 minReturnAmount)
```

Decodes and validates Smart swap parameters

_Validates receiver, amounts for Smart swaps_

#### Parameters

| Name     | Type    | Description                                                                   |
| -------- | ------- | ----------------------------------------------------------------------------- |
| selector | bytes4  | Function selector (SMART_SWAP_TO_SELECTOR or SMART_SWAP_BY_ORDER_ID_SELECTOR) |
| swapData | bytes   | Encoded swap data from OKX API                                                |
| amountIn | uint256 | Expected input amount                                                         |
| self     | address | Address of this contract (for receiver validation)                            |

#### Return Values

| Name            | Type    | Description                            |
| --------------- | ------- | -------------------------------------- |
| minReturnAmount | uint256 | Minimum return amount from baseRequest |

### \_decodeAndValidateUniV3Swap

```solidity
function _decodeAndValidateUniV3Swap(bytes4 selector, bytes swapData, uint256 amountIn, address self) internal pure returns (uint256 minReturnAmount)
```

Decodes and validates Uniswap V3 swap parameters

_Validates receiver, amounts for Uniswap V3 swaps. For UNIV3_SWAP_SELECTOR,
receiver is encoded as uint256 and must be converted to address._

#### Parameters

| Name     | Type    | Description                                                                         |
| -------- | ------- | ----------------------------------------------------------------------------------- |
| selector | bytes4  | Function selector (UNIV3_SWAP_SELECTOR or UNIV3_SWAP_TO_WITH_BASE_REQUEST_SELECTOR) |
| swapData | bytes   | Encoded swap data from OKX API                                                      |
| amountIn | uint256 | Expected input amount                                                               |
| self     | address | Address of this contract (for receiver validation)                                  |

#### Return Values

| Name            | Type    | Description                                |
| --------------- | ------- | ------------------------------------------ |
| minReturnAmount | uint256 | Minimum return amount from swap parameters |

### \_decodeAndValidateUnxSwap

```solidity
function _decodeAndValidateUnxSwap(bytes4 selector, bytes swapData, uint256 amountIn, address self) internal pure returns (uint256 minReturnAmount)
```

Decodes and validates Unxswap parameters

_Validates receiver, amounts for Unxswap operations_

#### Parameters

| Name     | Type    | Description                                                                                                     |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| selector | bytes4  | Function selector (UNXSWAP_TO_SELECTOR, UNXSWAP_BY_ORDER_ID_SELECTOR, or UNXSWAP_TO_WITH_BASE_REQUEST_SELECTOR) |
| swapData | bytes   | Encoded swap data from OKX API                                                                                  |
| amountIn | uint256 | Expected input amount                                                                                           |
| self     | address | Address of this contract (for receiver validation)                                                              |

#### Return Values

| Name            | Type    | Description                                |
| --------------- | ------- | ------------------------------------------ |
| minReturnAmount | uint256 | Minimum return amount from swap parameters |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
