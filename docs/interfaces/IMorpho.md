# Solidity API

## Id

## MarketParams

```solidity
struct MarketParams {
  address loanToken;
  address collateralToken;
  address oracle;
  address irm;
  uint256 lltv;
}
```

## Position

_Warning: For `feeRecipient`, `supplyShares` does not contain the accrued shares since the last interest
accrual._

```solidity
struct Position {
  uint256 supplyShares;
  uint128 borrowShares;
  uint128 collateral;
}
```

## Market

_Warning: `totalSupplyAssets` does not contain the accrued interest since the last interest accrual.
Warning: `totalBorrowAssets` does not contain the accrued interest since the last interest accrual.
Warning: `totalSupplyShares` does not contain the additional shares accrued by `feeRecipient` since the last
interest accrual._

```solidity
struct Market {
  uint128 totalSupplyAssets;
  uint128 totalSupplyShares;
  uint128 totalBorrowAssets;
  uint128 totalBorrowShares;
  uint128 lastUpdate;
  uint128 fee;
}
```

## Authorization

```solidity
struct Authorization {
  address authorizer;
  address authorized;
  bool isAuthorized;
  uint256 nonce;
  uint256 deadline;
}
```

## Signature

```solidity
struct Signature {
  uint8 v;
  bytes32 r;
  bytes32 s;
}
```

## IMorphoBase

_This interface is used for factorizing IMorphoStaticTyping and IMorpho.
Consider using the IMorpho interface instead of this one._

### DOMAIN_SEPARATOR

```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32)
```

The EIP-712 domain separator.

_Warning: Every EIP-712 signed message based on this domain separator can be reused on chains sharing the
same chain id and on forks because the domain separator would be the same._

### owner

```solidity
function owner() external view returns (address)
```

The owner of the contract.

_It has the power to change the owner.
It has the power to set fees on markets and set the fee recipient.
It has the power to enable but not disable IRMs and LLTVs._

### feeRecipient

```solidity
function feeRecipient() external view returns (address)
```

The fee recipient of all markets.

_The recipient receives the fees of a given market through a supply position on that market._

### isIrmEnabled

```solidity
function isIrmEnabled(address irm) external view returns (bool)
```

Whether the `irm` is enabled.

### isLltvEnabled

```solidity
function isLltvEnabled(uint256 lltv) external view returns (bool)
```

Whether the `lltv` is enabled.

### isAuthorized

```solidity
function isAuthorized(address authorizer, address authorized) external view returns (bool)
```

Whether `authorized` is authorized to modify `authorizer`'s position on all markets.

_Anyone is authorized to modify their own positions, regardless of this variable._

### nonce

```solidity
function nonce(address authorizer) external view returns (uint256)
```

The `authorizer`'s current nonce. Used to prevent replay attacks with EIP-712 signatures.

### setOwner

```solidity
function setOwner(address newOwner) external
```

Sets `newOwner` as `owner` of the contract.

_Warning: No two-step transfer ownership.
Warning: The owner can be set to the zero address._

### enableIrm

```solidity
function enableIrm(address irm) external
```

Enables `irm` as a possible IRM for market creation.

_Warning: It is not possible to disable an IRM._

### enableLltv

```solidity
function enableLltv(uint256 lltv) external
```

Enables `lltv` as a possible LLTV for market creation.

_Warning: It is not possible to disable a LLTV._

### setFee

```solidity
function setFee(struct MarketParams marketParams, uint256 newFee) external
```

Sets the `newFee` for the given market `marketParams`.

_Warning: The recipient can be the zero address._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams |  |
| newFee | uint256 | The new fee, scaled by WAD. |

### setFeeRecipient

```solidity
function setFeeRecipient(address newFeeRecipient) external
```

Sets `newFeeRecipient` as `feeRecipient` of the fee.

_Warning: If the fee recipient is set to the zero address, fees will accrue there and will be lost.
Modifying the fee recipient will allow the new recipient to claim any pending fees not yet accrued. To
ensure that the current recipient receives all due fees, accrue interest manually prior to making any changes._

### createMarket

```solidity
function createMarket(struct MarketParams marketParams) external
```

Creates the market `marketParams`.

_Here is the list of assumptions on the market's dependencies (tokens, IRM and oracle) that guarantees
Morpho behaves as expected:
- The token should be ERC-20 compliant, except that it can omit return values on `transfer` and `transferFrom`.
- The token balance of Morpho should only decrease on `transfer` and `transferFrom`. In particular, tokens with
burn functions are not supported.
- The token should not re-enter Morpho on `transfer` nor `transferFrom`.
- The token balance of the sender (resp. receiver) should decrease (resp. increase) by exactly the given amount
on `transfer` and `transferFrom`. In particular, tokens with fees on transfer are not supported.
- The IRM should not re-enter Morpho.
- The oracle should return a price with the correct scaling.
- The oracle price should not be able to change instantly such that the new price is less than the old price
multiplied by LLTV*LIF. In particular, if the loan asset is a vault that can receive donations, the oracle
should not price its shares using the AUM.
Here is a list of assumptions on the market's dependencies which, if broken, could break Morpho's liveness
properties (funds could get stuck):
- The token should not revert on `transfer` and `transferFrom` if balances and approvals are right.
- The amount of assets supplied and borrowed should not be too high (max ~1e32), otherwise the number of shares
might not fit within 128 bits.
- The IRM should not revert on `borrowRate`.
- The IRM should not return a very high borrow rate (otherwise the computation of `interest` in
`_accrueInterest` can overflow).
- The oracle should not revert `price`.
- The oracle should not return a very high price (otherwise the computation of `maxBorrow` in `_isHealthy` or of
`assetsRepaid` in `liquidate` can overflow).
The borrow share price of a market with less than 1e4 assets borrowed can be decreased by manipulations, to
the point where `totalBorrowShares` is very large and borrowing overflows._

### supply

```solidity
function supply(struct MarketParams marketParams, uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256 assetsSupplied, uint256 sharesSupplied)
```

Supplies `assets` or `shares` on behalf of `onBehalf`, optionally calling back the caller's
`onMorphoSupply` function with the given `data`.

_Either `assets` or `shares` should be zero. Most use cases should rely on `assets` as an input so the
caller is guaranteed to have `assets` tokens pulled from their balance, but the possibility to mint a specific
amount of shares is given for full compatibility and precision.
Supplying a large amount can revert for overflow.
Supplying an amount of shares may lead to supply more or fewer assets than expected due to slippage.
Consider using the `assets` parameter to avoid this._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams | The market to supply assets to. |
| assets | uint256 | The amount of assets to supply. |
| shares | uint256 | The amount of shares to mint. |
| onBehalf | address | The address that will own the increased supply position. |
| data | bytes | Arbitrary data to pass to the `onMorphoSupply` callback. Pass empty data if not needed. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsSupplied | uint256 | The amount of assets supplied. |
| sharesSupplied | uint256 | The amount of shares minted. |

### withdraw

```solidity
function withdraw(struct MarketParams marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn)
```

Withdraws `assets` or `shares` on behalf of `onBehalf` and sends the assets to `receiver`.

_Either `assets` or `shares` should be zero. To withdraw max, pass the `shares`'s balance of `onBehalf`.
`msg.sender` must be authorized to manage `onBehalf`'s positions.
Withdrawing an amount corresponding to more shares than supplied will revert for underflow.
It is advised to use the `shares` input when withdrawing the full position to avoid reverts due to
conversion roundings between shares and assets._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams | The market to withdraw assets from. |
| assets | uint256 | The amount of assets to withdraw. |
| shares | uint256 | The amount of shares to burn. |
| onBehalf | address | The address of the owner of the supply position. |
| receiver | address | The address that will receive the withdrawn assets. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsWithdrawn | uint256 | The amount of assets withdrawn. |
| sharesWithdrawn | uint256 | The amount of shares burned. |

### borrow

```solidity
function borrow(struct MarketParams marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed)
```

Borrows `assets` or `shares` on behalf of `onBehalf` and sends the assets to `receiver`.

_Either `assets` or `shares` should be zero. Most use cases should rely on `assets` as an input so the
caller is guaranteed to borrow `assets` of tokens, but the possibility to mint a specific amount of shares is
given for full compatibility and precision.
`msg.sender` must be authorized to manage `onBehalf`'s positions.
Borrowing a large amount can revert for overflow.
Borrowing an amount of shares may lead to borrow fewer assets than expected due to slippage.
Consider using the `assets` parameter to avoid this._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams | The market to borrow assets from. |
| assets | uint256 | The amount of assets to borrow. |
| shares | uint256 | The amount of shares to mint. |
| onBehalf | address | The address that will own the increased borrow position. |
| receiver | address | The address that will receive the borrowed assets. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsBorrowed | uint256 | The amount of assets borrowed. |
| sharesBorrowed | uint256 | The amount of shares minted. |

### repay

```solidity
function repay(struct MarketParams marketParams, uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256 assetsRepaid, uint256 sharesRepaid)
```

Repays `assets` or `shares` on behalf of `onBehalf`, optionally calling back the caller's
`onMorphoRepay` function with the given `data`.

_Either `assets` or `shares` should be zero. To repay max, pass the `shares`'s balance of `onBehalf`.
Repaying an amount corresponding to more shares than borrowed will revert for underflow.
It is advised to use the `shares` input when repaying the full position to avoid reverts due to conversion
roundings between shares and assets.
An attacker can front-run a repay with a small repay making the transaction revert for underflow._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams | The market to repay assets to. |
| assets | uint256 | The amount of assets to repay. |
| shares | uint256 | The amount of shares to burn. |
| onBehalf | address | The address of the owner of the debt position. |
| data | bytes | Arbitrary data to pass to the `onMorphoRepay` callback. Pass empty data if not needed. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetsRepaid | uint256 | The amount of assets repaid. |
| sharesRepaid | uint256 | The amount of shares burned. |

### supplyCollateral

```solidity
function supplyCollateral(struct MarketParams marketParams, uint256 assets, address onBehalf, bytes data) external
```

Supplies `assets` of collateral on behalf of `onBehalf`, optionally calling back the caller's
`onMorphoSupplyCollateral` function with the given `data`.

_Interest are not accrued since it's not required and it saves gas.
Supplying a large amount can revert for overflow._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams | The market to supply collateral to. |
| assets | uint256 | The amount of collateral to supply. |
| onBehalf | address | The address that will own the increased collateral position. |
| data | bytes | Arbitrary data to pass to the `onMorphoSupplyCollateral` callback. Pass empty data if not needed. |

### withdrawCollateral

```solidity
function withdrawCollateral(struct MarketParams marketParams, uint256 assets, address onBehalf, address receiver) external
```

Withdraws `assets` of collateral on behalf of `onBehalf` and sends the assets to `receiver`.

_`msg.sender` must be authorized to manage `onBehalf`'s positions.
Withdrawing an amount corresponding to more collateral than supplied will revert for underflow._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams | The market to withdraw collateral from. |
| assets | uint256 | The amount of collateral to withdraw. |
| onBehalf | address | The address of the owner of the collateral position. |
| receiver | address | The address that will receive the collateral assets. |

### liquidate

```solidity
function liquidate(struct MarketParams marketParams, address borrower, uint256 seizedAssets, uint256 repaidShares, bytes data) external returns (uint256, uint256)
```

Liquidates the given `repaidShares` of debt asset or seize the given `seizedAssets` of collateral on the
given market `marketParams` of the given `borrower`'s position, optionally calling back the caller's
`onMorphoLiquidate` function with the given `data`.

_Either `seizedAssets` or `repaidShares` should be zero.
Seizing more than the collateral balance will underflow and revert without any error message.
Repaying more than the borrow balance will underflow and revert without any error message.
An attacker can front-run a liquidation with a small repay making the transaction revert for underflow._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| marketParams | struct MarketParams | The market of the position. |
| borrower | address | The owner of the position. |
| seizedAssets | uint256 | The amount of collateral to seize. |
| repaidShares | uint256 | The amount of shares to repay. |
| data | bytes | Arbitrary data to pass to the `onMorphoLiquidate` callback. Pass empty data if not needed. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of assets seized. |
| [1] | uint256 | The amount of assets repaid. |

### flashLoan

```solidity
function flashLoan(address token, uint256 assets, bytes data) external
```

Executes a flash loan.

_Flash loans have access to the whole balance of the contract (the liquidity and deposited collateral of all
markets combined, plus donations).
Warning: Not ERC-3156 compliant but compatibility is easily reached:
- `flashFee` is zero.
- `maxFlashLoan` is the token's balance of this contract.
- The receiver of `assets` is the caller._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The token to flash loan. |
| assets | uint256 | The amount of assets to flash loan. |
| data | bytes | Arbitrary data to pass to the `onMorphoFlashLoan` callback. |

### setAuthorization

```solidity
function setAuthorization(address authorized, bool newIsAuthorized) external
```

Sets the authorization for `authorized` to manage `msg.sender`'s positions.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| authorized | address | The authorized address. |
| newIsAuthorized | bool | The new authorization status. |

### setAuthorizationWithSig

```solidity
function setAuthorizationWithSig(struct Authorization authorization, struct Signature signature) external
```

Sets the authorization for `authorization.authorized` to manage `authorization.authorizer`'s positions.

_Warning: Reverts if the signature has already been submitted.
The signature is malleable, but it has no impact on the security here.
The nonce is passed as argument to be able to revert with a different error message._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| authorization | struct Authorization | The `Authorization` struct. |
| signature | struct Signature | The signature. |

### accrueInterest

```solidity
function accrueInterest(struct MarketParams marketParams) external
```

Accrues interest for the given market `marketParams`.

### extSloads

```solidity
function extSloads(bytes32[] slots) external view returns (bytes32[])
```

Returns the data stored on the different `slots`.

## IMorphoStaticTyping

_This interface is inherited by Morpho so that function signatures are checked by the compiler.
Consider using the IMorpho interface instead of this one._

### position

```solidity
function position(Id id, address user) external view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)
```

The state of the position of `user` on the market corresponding to `id`.

_Warning: For `feeRecipient`, `supplyShares` does not contain the accrued shares since the last interest
accrual._

### market

```solidity
function market(Id id) external view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)
```

The state of the market corresponding to `id`.

_Warning: `totalSupplyAssets` does not contain the accrued interest since the last interest accrual.
Warning: `totalBorrowAssets` does not contain the accrued interest since the last interest accrual.
Warning: `totalSupplyShares` does not contain the accrued shares by `feeRecipient` since the last interest
accrual._

### idToMarketParams

```solidity
function idToMarketParams(Id id) external view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)
```

The market params corresponding to `id`.

_This mapping is not used in Morpho. It is there to enable reducing the cost associated to calldata on layer
2s by creating a wrapper contract with functions that take `id` as input instead of `marketParams`._

## IMorphoFlashLoanCallback

### onMorphoFlashLoan

```solidity
function onMorphoFlashLoan(uint256 assets, bytes data) external
```

Callback called when a flash loan occurs.

_The callback is called only if data is not empty._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The amount of assets that was flash loaned. |
| data | bytes | Arbitrary data passed to the `flashLoan` function. |

## IMorpho

_Use this interface for Morpho to have access to all the functions with the appropriate function signatures._

### position

```solidity
function position(Id id, address user) external view returns (struct Position p)
```

The state of the position of `user` on the market corresponding to `id`.

_Warning: For `feeRecipient`, `p.supplyShares` does not contain the accrued shares since the last interest
accrual._

### market

```solidity
function market(Id id) external view returns (struct Market m)
```

The state of the market corresponding to `id`.

_Warning: `m.totalSupplyAssets` does not contain the accrued interest since the last interest accrual.
Warning: `m.totalBorrowAssets` does not contain the accrued interest since the last interest accrual.
Warning: `m.totalSupplyShares` does not contain the accrued shares by `feeRecipient` since the last
interest accrual._

### idToMarketParams

```solidity
function idToMarketParams(Id id) external view returns (struct MarketParams)
```

The market params corresponding to `id`.

_This mapping is not used in Morpho. It is there to enable reducing the cost associated to calldata on layer
2s by creating a wrapper contract with functions that take `id` as input instead of `marketParams`._

