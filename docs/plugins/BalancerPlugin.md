# Solidity API

## BalancerPlugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

### takeFlashLoan

```solidity
function takeFlashLoan(address user, address baseAsset, address flp, uint256 amount, bytes, bytes swapData) public
```

### receiveFlashLoan

```solidity
function receiveFlashLoan(contract IERC20[] tokens, uint256[] amounts, uint256[] feeAmounts, bytes userData) external
```

_This function is called by the Vault when a flash loan is received._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokens | contract IERC20[] | The tokens being loaned. |
| amounts | uint256[] | The amounts of each token being loaned. |
| feeAmounts | uint256[] | The fees for each token being loaned. |
| userData | bytes | Arbitrary user data passed from the Vault. |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

