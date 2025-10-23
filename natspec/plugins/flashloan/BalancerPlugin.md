# Solidity API

## BalancerPlugin

This contract implements a plugin for interacting with the Balancer protocol's flash loan feature. It allows a caller to request
a flash loan, handles the callback from Balancer when the loan is issued, and provides a method to transfer of the borrowed funds.
The contract uses a unique identifier to securely track each flash loan operation and ensures that only authorized callbacks are
processed. It is designed to be used as part of a larger system that supports composable flash loan plugins.

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

### receiveFlashLoan

```solidity
function receiveFlashLoan(contract IERC20[] tokens, uint256[] amounts, uint256[] feeAmounts, bytes userData) external returns (struct ICometStructs.CallbackData _data)
```

_This function is called by the Vault when a flash loan is received._

#### Parameters

| Name       | Type              | Description                                |
| ---------- | ----------------- | ------------------------------------------ |
| tokens     | contract IERC20[] | The tokens being loaned.                   |
| amounts    | uint256[]         | The amounts of each token being loaned.    |
| feeAmounts | uint256[]         | The fees for each token being loaned.      |
| userData   | bytes             | Arbitrary user data passed from the Vault. |

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
