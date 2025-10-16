# Solidity API

## LiFiPlugin

Swap plugin for integrating LiFi aggregator with CometMultiplier

_Implements ICometSwapPlugin interface to provide standardized token swap functionality
using the LiFi aggregation router for optimal swap execution_

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
function _decodeSwapData(bytes swapData) internal pure returns (address payable receiver, uint256 minAmountOut, struct ILiFi.SwapData[] swaps)
```

Decodes the swapData for LiFi swap

#### Parameters

| Name     | Type  | Description                     |
| -------- | ----- | ------------------------------- |
| swapData | bytes | Encoded swap data from LiFi API |

#### Return Values

| Name         | Type                    | Description                       |
| ------------ | ----------------------- | --------------------------------- |
| receiver     | address payable         | Address to receive swapped tokens |
| minAmountOut | uint256                 | Minimum amount expected from swap |
| swaps        | struct ILiFi.SwapData[] | Array of swap steps               |

### \_validateSwapParams

```solidity
function _validateSwapParams(address receiver, struct ILiFi.SwapData[] swaps, address srcToken, address dstToken, uint256 amount, uint256 minAmountOut) internal view
```

Validates the swap parameters

#### Parameters

| Name         | Type                    | Description                    |
| ------------ | ----------------------- | ------------------------------ |
| receiver     | address                 | Address to receive tokens      |
| swaps        | struct ILiFi.SwapData[] | Array of swap steps            |
| srcToken     | address                 | Expected source token          |
| dstToken     | address                 | Expected destination token     |
| amount       | uint256                 | Expected input amount          |
| minAmountOut | uint256                 | Minimum expected output amount |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
