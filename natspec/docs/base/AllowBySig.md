# Solidity API

## AllowBySig

This contract provides a mechanism for allowing actions by signature.
It enables a user to authorize a manager to perform actions on their behalf.
This contract allows to avoid multiple transactions.

### \_allowBySig

```solidity
function _allowBySig(struct IAllowBySig.AllowParams params, address comet) internal
```

Allows a manager to perform actions on behalf of an owner via signature

#### Parameters

| Name   | Type                           | Description                               |
| ------ | ------------------------------ | ----------------------------------------- |
| params | struct IAllowBySig.AllowParams | The parameters required for the allowance |
| comet  | address                        | The address of the Comet contract         |
