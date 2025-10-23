# Solidity API

## AAVEPlugin

This contract implements a plugin for interacting with the AAVE protocol's flash loan feature. It allows a caller to request
a flash loan, handles the callback from AAVE when the loan is issued, and provides a method to approve repayment of the borrowed funds.
The contract uses a unique identifier to securely track each flash loan operation and ensures that only authorized callbacks are
processed. It is designed to be used as part of a larger system that supports composable flash loan plugins.\

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
function takeFlashLoan(struct ICometStructs.CallbackData data, bytes config) external payable
```

Initiates a flash loan

_Stores flash loan ID in transient storage for callback validation_

#### Parameters

| Name   | Type                              | Description                                                              |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| data   | struct ICometStructs.CallbackData | Flash loan parameters including debt amount, asset, and user information |
| config | bytes                             |                                                                          |

### executeOperation

```solidity
function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes params) external returns (struct ICometStructs.CallbackData _data)
```

Executes a flash loan operation

#### Parameters

| Name      | Type    | Description                                     |
| --------- | ------- | ----------------------------------------------- |
| asset     | address | The address of the asset being borrowed         |
| amount    | uint256 | The amount of the asset being borrowed          |
| premium   | uint256 | The premium to be paid for the flash loan (fee) |
| initiator | address | The address initiating the flash loan           |
| params    | bytes   | Additional parameters for the flash loan        |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address asset, uint256 amount) external
```

Repays the flash loan

#### Parameters

| Name   | Type    | Description                              |
| ------ | ------- | ---------------------------------------- |
| flp    | address | Address of the flash loan provider       |
| asset  | address |                                          |
| amount | uint256 | Total repayment amount (principal + fee) |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

Checks interface support

#### Parameters

| Name        | Type   | Description              |
| ----------- | ------ | ------------------------ |
| interfaceId | bytes4 | The interface identifier |

#### Return Values

| Name | Type | Description                                         |
| ---- | ---- | --------------------------------------------------- |
| [0]  | bool | True if the interface is supported, false otherwise |

### hook

```solidity
function hook() external pure returns (bytes)
```

Hook function for loan callback return. Aave

_AAVE requires uint256 == 1 while uniswap needs bytes memory layout. Other plugins require no return data.
This function standardizes the return data for CometFoundation to handle._

#### Return Values

| Name | Type  | Description                                              |
| ---- | ----- | -------------------------------------------------------- |
| [0]  | bytes | bytes memory Encoded return data for flash loan callback |
