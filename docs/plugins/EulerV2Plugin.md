# Solidity API

## EulerV2Plugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

### takeFlashLoan

```solidity
function takeFlashLoan(address user, address baseAsset, address flp, uint256 amount, bytes, bytes swapData) public
```

_Allows a user to take a flash loan from Euler for a given token and amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address |  |
| baseAsset | address | The address of the token to borrow |
| flp | address |  |
| amount | uint256 | The amount of the token to borrow |
|  | bytes |  |
| swapData | bytes |  |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

### onFlashLoan

```solidity
function onFlashLoan(bytes data) external returns (address, address, uint256, bytes)
```

