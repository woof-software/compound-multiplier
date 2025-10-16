# Solidity API

## OneInchV6SwapPlugin

Swap plugin for integrating 1inch V6 aggregator with CometMultiplier

_Implements ICometSwapPlugin interface to provide standardized token swap functionality
using the 1inch V6 aggregation router for optimal swap execution_

### SWAP_SELECTOR

```solidity
bytes4 SWAP_SELECTOR
```

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, bytes config, bytes swapData) external returns (uint256 amountOut)
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
function _decodeSwapData(bytes swapData) internal pure returns (struct IOneInchV6.SwapDescription desc)
```

Decodes swapData for 1inch V6 swap

#### Parameters

| Name     | Type  | Description                      |
| -------- | ----- | -------------------------------- |
| swapData | bytes | Encoded swap data from 1inch API |

#### Return Values

| Name | Type                              | Description                          |
| ---- | --------------------------------- | ------------------------------------ |
| desc | struct IOneInchV6.SwapDescription | Swap description with all parameters |

### \_validateSwapParams

```solidity
function _validateSwapParams(struct IOneInchV6.SwapDescription desc, address srcToken, address dstToken, uint256 amount) internal view
```

Validates the swap parameters

#### Parameters

| Name     | Type                              | Description                 |
| -------- | --------------------------------- | --------------------------- |
| desc     | struct IOneInchV6.SwapDescription | Swap description from 1inch |
| srcToken | address                           | Expected source token       |
| dstToken | address                           | Expected destination token  |
| amount   | uint256                           | Expected swap amount        |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
