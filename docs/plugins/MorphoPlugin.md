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

### takeFlashLoan

```solidity
function takeFlashLoan(address user, address baseAsset, address flp, uint256 amount, bytes, bytes swapData) public
```

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

### onMorphoFlashLoan

```solidity
function onMorphoFlashLoan(uint256 debt, bytes data) external returns (address, address, uint256, bytes)
```

