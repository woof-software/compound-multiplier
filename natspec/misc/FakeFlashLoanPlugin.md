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
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) public payable
```

Initiates a flash loan

_Stores flash loan ID in transient storage for callback validation_

#### Parameters

| Name | Type                                      | Description                                                              |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------ |
| data | struct ICometFlashLoanPlugin.CallbackData | Flash loan parameters including debt amount, asset, and user information |
|      | bytes                                     |                                                                          |

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
function onFlashLoan(bytes data) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

Checks if the contract implements a specific interface

#### Parameters

| Name        | Type   | Description                                       |
| ----------- | ------ | ------------------------------------------------- |
| interfaceId | bytes4 | The interface identifier, as specified in ERC-165 |
