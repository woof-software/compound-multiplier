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
  uint256 snapshot;
  uint256 flashLoanFee;
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

### SLOT_PLUGIN

```solidity
function SLOT_PLUGIN() external view returns (bytes32)
```

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes config) external
```

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address asset, uint256 amount) external
```

