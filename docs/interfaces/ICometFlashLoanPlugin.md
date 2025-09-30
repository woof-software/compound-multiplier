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

### SLOT_PLUGIN

```solidity
function SLOT_PLUGIN() external view returns (bytes32)
```

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) external payable
```

Initiates a flash loan

_Stores flash loan ID in transient storage for callback validation_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | struct ICometFlashLoanPlugin.CallbackData | Flash loan parameters including debt amount, asset, and user information |
|  | bytes |  |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

Repays the flash loan

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| flp | address | Address of the flash loan provider |
| baseAsset | address | Address of the borrowed asset |
| amount | uint256 | Total repayment amount (principal + fee) |

