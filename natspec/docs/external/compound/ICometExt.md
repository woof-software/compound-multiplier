# Solidity API

## ICometExt

An efficient monolithic money market protocol

### allow

```solidity
function allow(address manager, bool isAllowed) external
```

### allowBySig

```solidity
function allowBySig(address owner, address manager, bool isAllowed, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external
```

### isAllowed

```solidity
function isAllowed(address owner, address manager) external view returns (bool)
```

### version

```solidity
function version() external view returns (string)
```

### name

```solidity
function name() external view returns (string)
```

### userNonce

```solidity
function userNonce(address user) external view returns (uint256)
```
