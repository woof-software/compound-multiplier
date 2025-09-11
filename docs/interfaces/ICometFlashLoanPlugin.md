# Solidity API

## ICometFlashLoanPlugin

### UnauthorizedCallback

```solidity
error UnauthorizedCallback()
```

### InvalidFlashLoanId

```solidity
error InvalidFlashLoanId()
```

### InvalidFlashLoanData

```solidity
error InvalidFlashLoanData()
```

### CallbackData

```solidity
struct CallbackData {
  uint256 debt;
  uint256 fee;
  uint256 snapshot;
  address user;
  address flp;
  address asset;
  bytes swapData;
}
```

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
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes config) external
```

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address asset, uint256 amount) external
```

