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
  uint8 v;
}
```

