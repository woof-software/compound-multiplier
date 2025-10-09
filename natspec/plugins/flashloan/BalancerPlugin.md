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
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) external payable
```

Initiates a flash loan

_Stores flash loan ID in transient storage for callback validation_

#### Parameters

| Name | Type                                      | Description                                                              |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------ |
| data | struct ICometFlashLoanPlugin.CallbackData | Flash loan parameters including debt amount, asset, and user information |
|      | bytes                                     |                                                                          |

### receiveFlashLoan

```solidity
function receiveFlashLoan(contract IERC20[] tokens, uint256[] amounts, uint256[] feeAmounts, bytes userData) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
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

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
