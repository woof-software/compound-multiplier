# Solidity API

## AllowBySig

### AllowParams

```solidity
struct AllowParams {
  address comet;
  address owner;
  address manager;
  bool isAllowed;
  uint256 nonce;
  uint256 expiry;
  uint8 v;
  bytes32 r;
  bytes32 s;
}
```

### allowBySig

```solidity
function allowBySig(struct AllowBySig.AllowParams params) internal
```

