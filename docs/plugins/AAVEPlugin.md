# Solidity API

## AAVEPlugin

This contract implements a plugin for interacting with the AAVE protocol's flash loan feature. It allows a caller to request
a flash loan, handles the callback from AAVE when the loan is issued, and provides a method to approve repayment of the borrowed funds.
The contract uses a unique identifier to securely track each flash loan operation and ensures that only authorized callbacks are
processed. It is designed to be used as part of a larger system that supports composable flash loan plugins.

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

The selector of the callback function

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

Storage slot to store the flash loan ID

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) external
```

### executeOperation

```solidity
function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes params) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

Executes a flash loan operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The address of the asset being borrowed |
| amount | uint256 | The amount of the asset being borrowed |
| premium | uint256 | The premium to be paid for the flash loan (fee) |
| initiator | address | The address initiating the flash loan |
| params | bytes | Additional parameters for the flash loan |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address asset, uint256 amount) external
```

