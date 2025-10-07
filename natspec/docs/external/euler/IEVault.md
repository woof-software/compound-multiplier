# Solidity API

## IEVault

### repay

```solidity
function repay(uint256 amount, address receiver) external returns (uint256)
```

Transfer underlying tokens from the sender to the vault, and decrease receiver's debt

#### Parameters

| Name     | Type    | Description                                                       |
| -------- | ------- | ----------------------------------------------------------------- |
| amount   | uint256 | Amount of debt to repay in assets (use max uint256 for full debt) |
| receiver | address | Account holding the debt to be repaid                             |

#### Return Values

| Name | Type    | Description             |
| ---- | ------- | ----------------------- |
| [0]  | uint256 | Amount of assets repaid |

### flashLoan

```solidity
function flashLoan(uint256 amount, bytes data) external
```

Request a flash-loan. A onFlashLoan() callback in msg.sender will be invoked, which must repay the loan
to the main Euler address prior to returning.

#### Parameters

| Name   | Type    | Description                                                                                              |
| ------ | ------- | -------------------------------------------------------------------------------------------------------- |
| amount | uint256 | In asset units                                                                                           |
| data   | bytes   | Passed through to the onFlashLoan() callback, so contracts don't need to store transient data in storage |
