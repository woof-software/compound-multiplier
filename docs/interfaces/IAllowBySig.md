# Solidity API

## IAllowBySig

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

