# Solidity API

## ICometMultiplierPlugin

### UnauthorizedCallback

```solidity
error UnauthorizedCallback()
```

### InvalidFlashLoanId

```solidity
error InvalidFlashLoanId()
```

### InvalidAmountOut

```solidity
error InvalidAmountOut()
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
function takeFlashLoan(address user, address market, address flp, uint256 amount, bytes config, bytes swapData) external
```

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

