# Solidity API

## IComet

An efficient monolithic money market protocol

### AssetInfo

```solidity
struct AssetInfo {
  uint8 offset;
  address asset;
  address priceFeed;
  uint64 scale;
  uint64 borrowCollateralFactor;
  uint64 liquidateCollateralFactor;
  uint64 liquidationFactor;
  uint128 supplyCap;
}
```

### UserCollateral

```solidity
struct UserCollateral {
  uint128 balance;
  uint128 _reserved;
}
```

### Unauthorized

```solidity
error Unauthorized()
```

### supply

```solidity
function supply(address asset, uint256 amount) external
```

### supplyTo

```solidity
function supplyTo(address dst, address asset, uint256 amount) external
```

### withdraw

```solidity
function withdraw(address asset, uint256 amount) external
```

### withdrawFrom

```solidity
function withdrawFrom(address src, address to, address asset, uint256 amount) external
```

### getAssetInfoByAddress

```solidity
function getAssetInfoByAddress(address asset) external view returns (struct IComet.AssetInfo)
```

### getPrice

```solidity
function getPrice(address priceFeed) external view returns (uint256)
```

### borrowBalanceOf

```solidity
function borrowBalanceOf(address account) external view returns (uint256)
```

### collateralBalanceOf

```solidity
function collateralBalanceOf(address account, address asset) external view returns (uint128)
```

### baseToken

```solidity
function baseToken() external view returns (address)
```

### baseScale

```solidity
function baseScale() external view returns (uint256)
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### hasPermission

```solidity
function hasPermission(address owner, address manager) external view returns (bool)
```

### userCollateral

```solidity
function userCollateral(address user, address asset) external view returns (struct IComet.UserCollateral)
```
