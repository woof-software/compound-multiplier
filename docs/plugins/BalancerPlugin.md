# Solidity API

## BalancerPlugin

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

