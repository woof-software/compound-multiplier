# Solidity API

## MorphoPlugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback selector: keccak256("onMorphoFlashLoan(uint256 assets, bytes calldata data)") = 0x31f57072

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
function repayFlashLoan(address flp, address asset, uint256 amount) external
```

### onMorphoFlashLoan

```solidity
function onMorphoFlashLoan(uint256, bytes data) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

