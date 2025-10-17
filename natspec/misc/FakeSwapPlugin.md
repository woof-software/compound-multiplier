# Solidity API

## FakeSwapPlugin

### SWAP_SELECTOR

```solidity
bytes4 SWAP_SELECTOR
```

### WHALE

```solidity
address WHALE
```

### swap

```solidity
function swap(address srcToken, address, uint256 amountIn, bytes, bytes) external returns (uint256 amountOut)
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
