# Solidity API

## FakeFlashLoanPlugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

The selector of the callback function

### WHALE

```solidity
address WHALE
```

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

Storage slot to store the flash loan ID

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometStructs.CallbackData data, bytes) public payable
```

Initiates a flash loan

_Stores flash loan ID in transient storage for callback validation_

#### Parameters

| Name | Type                              | Description                                                              |
| ---- | --------------------------------- | ------------------------------------------------------------------------ |
| data | struct ICometStructs.CallbackData | Flash loan parameters including debt amount, asset, and user information |
|      | bytes                             |                                                                          |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

Repays the flash loan

#### Parameters

| Name      | Type    | Description                              |
| --------- | ------- | ---------------------------------------- |
| flp       | address | Address of the flash loan provider       |
| baseAsset | address | Address of the borrowed asset            |
| amount    | uint256 | Total repayment amount (principal + fee) |

### onFlashLoan

```solidity
function onFlashLoan(bytes data) external returns (struct ICometStructs.CallbackData _data)
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
