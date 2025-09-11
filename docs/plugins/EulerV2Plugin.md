# Solidity API

## EulerV2Plugin

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
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) public
```

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

### onFlashLoan

```solidity
function onFlashLoan(bytes data) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

