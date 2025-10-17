# Solidity API

## WstEthPlugin

Swap plugin for converting between WETH and wstETH via Lido staking

_Implements ICometSwapPlugin interface to provide specialized WETH / wstETH conversion_

### SWAP_SELECTOR

```solidity
bytes4 SWAP_SELECTOR
```

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

### swap

```solidity
function swap(address srcToken, address dstToken, uint256 amountIn, bytes, bytes swapData) external returns (uint256 amountOut)
```

Executes a token swap between two assets

#### Parameters

| Name     | Type    | Description                                            |
| -------- | ------- | ------------------------------------------------------ |
| srcToken | address | Address of the source token to swap from               |
| dstToken | address | Address of the destination token to swap to            |
| amountIn | uint256 | Amount of source tokens to swap                        |
|          | bytes   |                                                        |
| swapData | bytes   | Encoded data required by the underlying swap mechanism |

#### Return Values

| Name      | Type    | Description                                                    |
| --------- | ------- | -------------------------------------------------------------- |
| amountOut | uint256 | The actual amount of destination tokens received from the swap |

### \_lidoSwap

```solidity
function _lidoSwap(address wEth, address wstEth, address stEth, uint256 amountIn, uint256 minAmountOut) internal returns (uint256 amountOut)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
