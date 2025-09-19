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

### Absurd

```solidity
error Absurd()
```

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### BadAsset

```solidity
error BadAsset()
```

### BadDecimals

```solidity
error BadDecimals()
```

### BadDiscount

```solidity
error BadDiscount()
```

### BadMinimum

```solidity
error BadMinimum()
```

### BadPrice

```solidity
error BadPrice()
```

### BorrowTooSmall

```solidity
error BorrowTooSmall()
```

### BorrowCFTooLarge

```solidity
error BorrowCFTooLarge()
```

### InsufficientReserves

```solidity
error InsufficientReserves()
```

### LiquidateCFTooLarge

```solidity
error LiquidateCFTooLarge()
```

### NoSelfTransfer

```solidity
error NoSelfTransfer()
```

### NotCollateralized

```solidity
error NotCollateralized()
```

### NotForSale

```solidity
error NotForSale()
```

### NotLiquidatable

```solidity
error NotLiquidatable()
```

### Paused

```solidity
error Paused()
```

### ReentrantCallBlocked

```solidity
error ReentrantCallBlocked()
```

### SupplyCapExceeded

```solidity
error SupplyCapExceeded()
```

### TimestampTooLarge

```solidity
error TimestampTooLarge()
```

### TooManyAssets

```solidity
error TooManyAssets()
```

### TooMuchSlippage

```solidity
error TooMuchSlippage()
```

### TransferInFailed

```solidity
error TransferInFailed()
```

### TransferOutFailed

```solidity
error TransferOutFailed()
```

### Unauthorized

```solidity
error Unauthorized()
```

### Supply

```solidity
event Supply(address from, address dst, uint256 amount)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 amount)
```

### Withdraw

```solidity
event Withdraw(address src, address to, uint256 amount)
```

### SupplyCollateral

```solidity
event SupplyCollateral(address from, address dst, address asset, uint256 amount)
```

### TransferCollateral

```solidity
event TransferCollateral(address from, address to, address asset, uint256 amount)
```

### WithdrawCollateral

```solidity
event WithdrawCollateral(address src, address to, address asset, uint256 amount)
```

### AbsorbDebt

```solidity
event AbsorbDebt(address absorber, address borrower, uint256 basePaidOut, uint256 usdValue)
```

Event emitted when a borrow position is absorbed by the protocol

### AbsorbCollateral

```solidity
event AbsorbCollateral(address absorber, address borrower, address asset, uint256 collateralAbsorbed, uint256 usdValue)
```

Event emitted when a user's collateral is absorbed by the protocol

### BuyCollateral

```solidity
event BuyCollateral(address buyer, address asset, uint256 baseAmount, uint256 collateralAmount)
```

Event emitted when a collateral asset is purchased from the protocol

### PauseAction

```solidity
event PauseAction(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused)
```

Event emitted when an action is paused/unpaused

### WithdrawReserves

```solidity
event WithdrawReserves(address to, uint256 amount)
```

Event emitted when reserves are withdrawn by the governor

### supply

```solidity
function supply(address asset, uint256 amount) external
```

### supplyTo

```solidity
function supplyTo(address dst, address asset, uint256 amount) external
```

### supplyFrom

```solidity
function supplyFrom(address from, address dst, address asset, uint256 amount) external
```

### transfer

```solidity
function transfer(address dst, uint256 amount) external returns (bool)
```

### transferFrom

```solidity
function transferFrom(address src, address dst, uint256 amount) external returns (bool)
```

### transferAsset

```solidity
function transferAsset(address dst, address asset, uint256 amount) external
```

### transferAssetFrom

```solidity
function transferAssetFrom(address src, address dst, address asset, uint256 amount) external
```

### withdraw

```solidity
function withdraw(address asset, uint256 amount) external
```

### withdrawTo

```solidity
function withdrawTo(address to, address asset, uint256 amount) external
```

### withdrawFrom

```solidity
function withdrawFrom(address src, address to, address asset, uint256 amount) external
```

### approveThis

```solidity
function approveThis(address manager, address asset, uint256 amount) external
```

### withdrawReserves

```solidity
function withdrawReserves(address to, uint256 amount) external
```

### absorb

```solidity
function absorb(address absorber, address[] accounts) external
```

### buyCollateral

```solidity
function buyCollateral(address asset, uint256 minAmount, uint256 baseAmount, address recipient) external
```

### quoteCollateral

```solidity
function quoteCollateral(address asset, uint256 baseAmount) external view returns (uint256)
```

### getAssetInfo

```solidity
function getAssetInfo(uint8 i) external view returns (struct IComet.AssetInfo)
```

### getAssetInfoByAddress

```solidity
function getAssetInfoByAddress(address asset) external view returns (struct IComet.AssetInfo)
```

### getCollateralReserves

```solidity
function getCollateralReserves(address asset) external view returns (uint256)
```

### getReserves

```solidity
function getReserves() external view returns (int256)
```

### getPrice

```solidity
function getPrice(address priceFeed) external view returns (uint256)
```

### isBorrowCollateralized

```solidity
function isBorrowCollateralized(address account) external view returns (bool)
```

### isLiquidatable

```solidity
function isLiquidatable(address account) external view returns (bool)
```

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

### totalBorrow

```solidity
function totalBorrow() external view returns (uint256)
```

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```

### borrowBalanceOf

```solidity
function borrowBalanceOf(address account) external view returns (uint256)
```

### collateralBalanceOf

```solidity
function collateralBalanceOf(address account, address asset) external view returns (uint128)
```

### pause

```solidity
function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external
```

### isSupplyPaused

```solidity
function isSupplyPaused() external view returns (bool)
```

### isTransferPaused

```solidity
function isTransferPaused() external view returns (bool)
```

### isWithdrawPaused

```solidity
function isWithdrawPaused() external view returns (bool)
```

### isAbsorbPaused

```solidity
function isAbsorbPaused() external view returns (bool)
```

### isBuyPaused

```solidity
function isBuyPaused() external view returns (bool)
```

### accrueAccount

```solidity
function accrueAccount(address account) external
```

### getSupplyRate

```solidity
function getSupplyRate(uint256 utilization) external view returns (uint64)
```

### getBorrowRate

```solidity
function getBorrowRate(uint256 utilization) external view returns (uint64)
```

### getUtilization

```solidity
function getUtilization() external view returns (uint256)
```

### governor

```solidity
function governor() external view returns (address)
```

### pauseGuardian

```solidity
function pauseGuardian() external view returns (address)
```

### baseToken

```solidity
function baseToken() external view returns (address)
```

### baseTokenPriceFeed

```solidity
function baseTokenPriceFeed() external view returns (address)
```

### extensionDelegate

```solidity
function extensionDelegate() external view returns (address)
```

### supplyKink

```solidity
function supplyKink() external view returns (uint256)
```

_uint64_

### supplyPerSecondInterestRateSlopeLow

```solidity
function supplyPerSecondInterestRateSlopeLow() external view returns (uint256)
```

_uint64_

### supplyPerSecondInterestRateSlopeHigh

```solidity
function supplyPerSecondInterestRateSlopeHigh() external view returns (uint256)
```

_uint64_

### supplyPerSecondInterestRateBase

```solidity
function supplyPerSecondInterestRateBase() external view returns (uint256)
```

_uint64_

### borrowKink

```solidity
function borrowKink() external view returns (uint256)
```

_uint64_

### borrowPerSecondInterestRateSlopeLow

```solidity
function borrowPerSecondInterestRateSlopeLow() external view returns (uint256)
```

_uint64_

### borrowPerSecondInterestRateSlopeHigh

```solidity
function borrowPerSecondInterestRateSlopeHigh() external view returns (uint256)
```

_uint64_

### borrowPerSecondInterestRateBase

```solidity
function borrowPerSecondInterestRateBase() external view returns (uint256)
```

_uint64_

### storeFrontPriceFactor

```solidity
function storeFrontPriceFactor() external view returns (uint256)
```

_uint64_

### baseScale

```solidity
function baseScale() external view returns (uint256)
```

_uint64_

### trackingIndexScale

```solidity
function trackingIndexScale() external view returns (uint256)
```

_uint64_

### baseTrackingSupplySpeed

```solidity
function baseTrackingSupplySpeed() external view returns (uint256)
```

_uint64_

### baseTrackingBorrowSpeed

```solidity
function baseTrackingBorrowSpeed() external view returns (uint256)
```

_uint64_

### baseMinForRewards

```solidity
function baseMinForRewards() external view returns (uint256)
```

_uint104_

### baseBorrowMin

```solidity
function baseBorrowMin() external view returns (uint256)
```

_uint104_

### targetReserves

```solidity
function targetReserves() external view returns (uint256)
```

_uint104_

### numAssets

```solidity
function numAssets() external view returns (uint8)
```

### decimals

```solidity
function decimals() external view returns (uint8)
```

### initializeStorage

```solidity
function initializeStorage() external
```

### allowBySig

```solidity
function allowBySig(address owner, address manager, bool isAllowed, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external
```

### version

```solidity
function version() external view returns (string)
```

### name

```solidity
function name() external view returns (string)
```

### hasPermission

```solidity
function hasPermission(address owner, address manager) external view returns (bool)
```

### userNonce

```solidity
function userNonce(address user) external view returns (uint256)
```

### allow

```solidity
function allow(address manager, bool isAllowed) external
```

### UserCollateral

```solidity
struct UserCollateral {
  uint128 balance;
  uint128 _reserved;
}
```

### userCollateral

```solidity
function userCollateral(address user, address asset) external view returns (struct IComet.UserCollateral)
```

Mapping of users to collateral data per collateral asset

