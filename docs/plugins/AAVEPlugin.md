# Solidity API

## AAVEPlugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

### WrongInitiator

```solidity
error WrongInitiator()
```

### WrongPool

```solidity
error WrongPool()
```

### takeFlashLoan

```solidity
function takeFlashLoan(address user, address market, address flp, uint256 amount, bytes, bytes swapData) public
```

### executeOperation

```solidity
function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes params) external returns (bool)
```

Executes an operation after receiving the flash-borrowed asset

_Ensure that the contract can return the debt + premium, e.g., has
     enough funds to repay and has approved the Pool to pull the total amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The address of the flash-borrowed asset |
| amount | uint256 | The amount of the flash-borrowed asset |
| premium | uint256 | The fee of the flash-borrowed asset |
| initiator | address | The address of the flashloan initiator |
| params | bytes | The byte-encoded params passed when initiating the flashloan |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the execution of the operation succeeds, false otherwise |

