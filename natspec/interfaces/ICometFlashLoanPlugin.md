# Solidity API

## ICometFlashLoanPlugin

### CALLBACK_SELECTOR

```solidity
function CALLBACK_SELECTOR() external view returns (bytes4)
```

The selector of the callback function

### SLOT_PLUGIN

```solidity
function SLOT_PLUGIN() external view returns (bytes32)
```

Storage slot to store the flash loan ID

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometStructs.CallbackData data, bytes) external payable
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
