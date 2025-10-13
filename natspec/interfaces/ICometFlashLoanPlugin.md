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

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### CallbackData

Data structure for flash loan callback parameters

_This struct is used to pass necessary information during the flash loan callback
and must be encoded/decoded appropriately._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

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
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) external payable
```

Initiates a flash loan

_Stores flash loan ID in transient storage for callback validation_

#### Parameters

| Name | Type                                      | Description                                                              |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------ |
| data | struct ICometFlashLoanPlugin.CallbackData | Flash loan parameters including debt amount, asset, and user information |
|      | bytes                                     |                                                                          |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

Repays the flash loan

#### Parameters

| Name      | Type    | Description                              |
| --------- | ------- | ---------------------------------------- |
| flp       | address | Address of the flash loan provider       |
| baseAsset | address | Address of the borrowed asset            |
| amount    | uint256 | Total repayment amount (principal + fee) |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

Checks if the contract implements a specific interface

#### Parameters

| Name        | Type   | Description                                       |
| ----------- | ------ | ------------------------------------------------- |
| interfaceId | bytes4 | The interface identifier, as specified in ERC-165 |
