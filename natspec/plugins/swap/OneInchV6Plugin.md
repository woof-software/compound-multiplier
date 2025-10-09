# Solidity API

## OneInchV6SwapPlugin

Swap plugin for integrating 1inch V6 aggregator with CometMultiplierAdapter

_Implements ICometSwapPlugin interface to provide standardized token swap functionality
using the 1inch V6 aggregation router for optimal swap execution_

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

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
