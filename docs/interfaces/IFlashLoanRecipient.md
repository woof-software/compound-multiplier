# Solidity API

## IFlashLoanRecipient

### receiveFlashLoan

```solidity
function receiveFlashLoan(contract IERC20[] tokens, uint256[] amounts, uint256[] feeAmounts, bytes userData) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

_When `flashLoan` is called on the Vault, it invokes the `receiveFlashLoan` hook on the recipient.

At the time of the call, the Vault will have transferred `amounts` for `tokens` to the recipient. Before this
call returns, the recipient must have transferred `amounts` plus `feeAmounts` for each token back to the
Vault, or else the entire flash loan will revert.

`userData` is the same value passed in the `IVault.flashLoan` call._

