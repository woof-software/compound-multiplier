# Solidity API

## AAVEPlugin

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

### executeOperation

```solidity
function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes params) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address asset, uint256 amount) external
```

