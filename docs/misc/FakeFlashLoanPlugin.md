# Solidity API

## FakeFlashLoanPlugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

### WHALE

```solidity
address WHALE
```

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

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

