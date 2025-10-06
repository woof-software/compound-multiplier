# Solidity API

## IBalancerVault

### flashLoan

```solidity
function flashLoan(contract IFlashLoanRecipient recipient, contract IERC20[] tokens, uint256[] amounts, bytes userData) external
```

_Performs a 'flash loan', sending tokens to `recipient`, executing the `receiveFlashLoan` hook on it,
and then reverting unless the tokens plus a proportional protocol fee have been returned.

The `tokens` and `amounts` arrays must have the same length, and each entry in these indicates the loan amount
for each token contract. `tokens` must be sorted in ascending order.

The 'userData' field is ignored by the Vault, and forwarded as-is to `recipient` as part of the
`receiveFlashLoan` call.

Emits `FlashLoan` events._

