# Solidity API

## AllowBySig

This contract provides a mechanism for allowing actions by signature.
 It enables a user to authorize a manager to perform actions on their behalf.
 This contract allows to avoid multiple transactions.

### AllowParams

Structure defines the parameters required for make approval via signature on comet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct AllowParams {
  uint256 nonce;
  uint256 expiry;
  bytes32 r;
  bytes32 s;
  address owner;
  bool isAllowed;
  address manager;
  uint8 v;
}
```

### InvalidManager

```solidity
error InvalidManager()
```

_Thrown when the manager is invalid_

### InvalidOwner

```solidity
error InvalidOwner()
```

_Thrown when the owner is invalid_

### InvalidAllowedType

```solidity
error InvalidAllowedType()
```

_Thrown when the allowed type is invalid_

### _allowBySig

```solidity
function _allowBySig(struct AllowBySig.AllowParams params, address comet) internal
```

Allows a manager to perform actions on behalf of an owner via signature

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct AllowBySig.AllowParams | The parameters required for the allowance |
| comet | address | The address of the Comet contract |

