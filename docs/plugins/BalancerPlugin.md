# Solidity API

## BalancerPlugin

This contract implements a plugin for interacting with the Balancer protocol's flash loan feature. It allows a caller to request
a flash loan, handles the callback from Balancer when the loan is issued, and provides a method to transfer of the borrowed funds.
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

### receiveFlashLoan

```solidity
function receiveFlashLoan(contract IERC20[] tokens, uint256[] amounts, uint256[] feeAmounts, bytes userData) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

_This function is called by the Vault when a flash loan is received._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokens | contract IERC20[] | The tokens being loaned. |
| amounts | uint256[] | The amounts of each token being loaned. |
| feeAmounts | uint256[] | The fees for each token being loaned. |
| userData | bytes | Arbitrary user data passed from the Vault. |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address asset, uint256 amount) external
```

