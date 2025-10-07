# Solidity API

## IInitialize

Interface of the initialization module of EVault

### initialize

```solidity
function initialize(address proxyCreator) external
```

Initialization of the newly deployed proxy contract

#### Parameters

| Name         | Type    | Description                                                       |
| ------------ | ------- | ----------------------------------------------------------------- |
| proxyCreator | address | Account which created the proxy or should be the initial governor |

## IERC4626

Interface of an ERC4626 vault

### asset

```solidity
function asset() external view returns (address)
```

Vault's underlying asset

#### Return Values

| Name | Type    | Description                  |
| ---- | ------- | ---------------------------- |
| [0]  | address | The vault's underlying asset |

### totalAssets

```solidity
function totalAssets() external view returns (uint256)
```

Total amount of managed assets, cash and borrows

#### Return Values

| Name | Type    | Description                |
| ---- | ------- | -------------------------- |
| [0]  | uint256 | The total amount of assets |

### convertToAssets

```solidity
function convertToAssets(uint256 shares) external view returns (uint256)
```

Calculate amount of assets corresponding to the requested shares amount

#### Parameters

| Name   | Type    | Description                 |
| ------ | ------- | --------------------------- |
| shares | uint256 | Amount of shares to convert |

#### Return Values

| Name | Type    | Description          |
| ---- | ------- | -------------------- |
| [0]  | uint256 | The amount of assets |

### convertToShares

```solidity
function convertToShares(uint256 assets) external view returns (uint256)
```

Calculate amount of shares corresponding to the requested assets amount

#### Parameters

| Name   | Type    | Description                 |
| ------ | ------- | --------------------------- |
| assets | uint256 | Amount of assets to convert |

#### Return Values

| Name | Type    | Description          |
| ---- | ------- | -------------------- |
| [0]  | uint256 | The amount of shares |

### maxDeposit

```solidity
function maxDeposit(address account) external view returns (uint256)
```

Fetch the maximum amount of assets a user can deposit

#### Parameters

| Name    | Type    | Description      |
| ------- | ------- | ---------------- |
| account | address | Address to query |

#### Return Values

| Name | Type    | Description                                      |
| ---- | ------- | ------------------------------------------------ |
| [0]  | uint256 | The max amount of assets the account can deposit |

### previewDeposit

```solidity
function previewDeposit(uint256 assets) external view returns (uint256)
```

Calculate an amount of shares that would be created by depositing assets

#### Parameters

| Name   | Type    | Description                |
| ------ | ------- | -------------------------- |
| assets | uint256 | Amount of assets deposited |

#### Return Values

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| [0]  | uint256 | Amount of shares received |

### maxMint

```solidity
function maxMint(address account) external view returns (uint256)
```

Fetch the maximum amount of shares a user can mint

#### Parameters

| Name    | Type    | Description      |
| ------- | ------- | ---------------- |
| account | address | Address to query |

#### Return Values

| Name | Type    | Description                                   |
| ---- | ------- | --------------------------------------------- |
| [0]  | uint256 | The max amount of shares the account can mint |

### previewMint

```solidity
function previewMint(uint256 shares) external view returns (uint256)
```

Calculate an amount of assets that would be required to mint requested amount of shares

#### Parameters

| Name   | Type    | Description                   |
| ------ | ------- | ----------------------------- |
| shares | uint256 | Amount of shares to be minted |

#### Return Values

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| [0]  | uint256 | Required amount of assets |

### maxWithdraw

```solidity
function maxWithdraw(address owner) external view returns (uint256)
```

Fetch the maximum amount of assets a user is allowed to withdraw

#### Parameters

| Name  | Type    | Description                |
| ----- | ------- | -------------------------- |
| owner | address | Account holding the shares |

#### Return Values

| Name | Type    | Description                                                   |
| ---- | ------- | ------------------------------------------------------------- |
| [0]  | uint256 | The maximum amount of assets the owner is allowed to withdraw |

### previewWithdraw

```solidity
function previewWithdraw(uint256 assets) external view returns (uint256)
```

Calculate the amount of shares that will be burned when withdrawing requested amount of assets

#### Parameters

| Name   | Type    | Description                |
| ------ | ------- | -------------------------- |
| assets | uint256 | Amount of assets withdrawn |

#### Return Values

| Name | Type    | Description             |
| ---- | ------- | ----------------------- |
| [0]  | uint256 | Amount of shares burned |

### maxRedeem

```solidity
function maxRedeem(address owner) external view returns (uint256)
```

Fetch the maximum amount of shares a user is allowed to redeem for assets

#### Parameters

| Name  | Type    | Description                |
| ----- | ------- | -------------------------- |
| owner | address | Account holding the shares |

#### Return Values

| Name | Type    | Description                                                 |
| ---- | ------- | ----------------------------------------------------------- |
| [0]  | uint256 | The maximum amount of shares the owner is allowed to redeem |

### previewRedeem

```solidity
function previewRedeem(uint256 shares) external view returns (uint256)
```

Calculate the amount of assets that will be transferred when redeeming requested amount of shares

#### Parameters

| Name   | Type    | Description               |
| ------ | ------- | ------------------------- |
| shares | uint256 | Amount of shares redeemed |

#### Return Values

| Name | Type    | Description                  |
| ---- | ------- | ---------------------------- |
| [0]  | uint256 | Amount of assets transferred |

### deposit

```solidity
function deposit(uint256 amount, address receiver) external returns (uint256)
```

Transfer requested amount of underlying tokens from sender to the vault pool in return for shares

_Deposit will round down the amount of assets that are converted to shares. To prevent losses consider using
mint instead._

#### Parameters

| Name     | Type    | Description                                                                     |
| -------- | ------- | ------------------------------------------------------------------------------- |
| amount   | uint256 | Amount of assets to deposit (use max uint256 for full underlying token balance) |
| receiver | address | An account to receive the shares                                                |

#### Return Values

| Name | Type    | Description             |
| ---- | ------- | ----------------------- |
| [0]  | uint256 | Amount of shares minted |

### mint

```solidity
function mint(uint256 amount, address receiver) external returns (uint256)
```

Transfer underlying tokens from sender to the vault pool in return for requested amount of shares

#### Parameters

| Name     | Type    | Description                      |
| -------- | ------- | -------------------------------- |
| amount   | uint256 | Amount of shares to be minted    |
| receiver | address | An account to receive the shares |

#### Return Values

| Name | Type    | Description                |
| ---- | ------- | -------------------------- |
| [0]  | uint256 | Amount of assets deposited |

### withdraw

```solidity
function withdraw(uint256 amount, address receiver, address owner) external returns (uint256)
```

Transfer requested amount of underlying tokens from the vault and decrease account's shares balance

#### Parameters

| Name     | Type    | Description                             |
| -------- | ------- | --------------------------------------- |
| amount   | uint256 | Amount of assets to withdraw            |
| receiver | address | Account to receive the withdrawn assets |
| owner    | address | Account holding the shares to burn      |

#### Return Values

| Name | Type    | Description             |
| ---- | ------- | ----------------------- |
| [0]  | uint256 | Amount of shares burned |

### redeem

```solidity
function redeem(uint256 amount, address receiver, address owner) external returns (uint256)
```

Burn requested shares and transfer corresponding underlying tokens from the vault to the receiver

#### Parameters

| Name     | Type    | Description                                                           |
| -------- | ------- | --------------------------------------------------------------------- |
| amount   | uint256 | Amount of shares to burn (use max uint256 to burn full owner balance) |
| receiver | address | Account to receive the withdrawn assets                               |
| owner    | address | Account holding the shares to burn.                                   |

#### Return Values

| Name | Type    | Description                  |
| ---- | ------- | ---------------------------- |
| [0]  | uint256 | Amount of assets transferred |

## IVault

Interface of the EVault's Vault module

### accumulatedFees

```solidity
function accumulatedFees() external view returns (uint256)
```

Balance of the fees accumulator, in shares

#### Return Values

| Name | Type    | Description                    |
| ---- | ------- | ------------------------------ |
| [0]  | uint256 | The accumulated fees in shares |

### accumulatedFeesAssets

```solidity
function accumulatedFeesAssets() external view returns (uint256)
```

Balance of the fees accumulator, in underlying units

#### Return Values

| Name | Type    | Description                         |
| ---- | ------- | ----------------------------------- |
| [0]  | uint256 | The accumulated fees in asset units |

### creator

```solidity
function creator() external view returns (address)
```

Address of the original vault creator

#### Return Values

| Name | Type    | Description                |
| ---- | ------- | -------------------------- |
| [0]  | address | The address of the creator |

### skim

```solidity
function skim(uint256 amount, address receiver) external returns (uint256)
```

Creates shares for the receiver, from excess asset balances of the vault (not accounted for in `cash`)

_Could be used as an alternative deposit flow in certain scenarios. E.g. swap directly to the vault, call
`skim` to claim deposit._

#### Parameters

| Name     | Type    | Description                                                               |
| -------- | ------- | ------------------------------------------------------------------------- |
| amount   | uint256 | Amount of assets to claim (use max uint256 to claim all available assets) |
| receiver | address | An account to receive the shares                                          |

#### Return Values

| Name | Type    | Description             |
| ---- | ------- | ----------------------- |
| [0]  | uint256 | Amount of shares minted |

## IBorrowing

Interface of the EVault's Borrowing module

### totalBorrows

```solidity
function totalBorrows() external view returns (uint256)
```

Sum of all outstanding debts, in underlying units (increases as interest is accrued)

#### Return Values

| Name | Type    | Description                      |
| ---- | ------- | -------------------------------- |
| [0]  | uint256 | The total borrows in asset units |

### totalBorrowsExact

```solidity
function totalBorrowsExact() external view returns (uint256)
```

Sum of all outstanding debts, in underlying units scaled up by shifting
INTERNAL_DEBT_PRECISION_SHIFT bits

#### Return Values

| Name | Type    | Description                                  |
| ---- | ------- | -------------------------------------------- |
| [0]  | uint256 | The total borrows in internal debt precision |

### cash

```solidity
function cash() external view returns (uint256)
```

Balance of vault assets as tracked by deposits/withdrawals and borrows/repays

#### Return Values

| Name | Type    | Description                                                      |
| ---- | ------- | ---------------------------------------------------------------- |
| [0]  | uint256 | The amount of assets the vault tracks as current direct holdings |

### debtOf

```solidity
function debtOf(address account) external view returns (uint256)
```

Debt owed by a particular account, in underlying units

#### Parameters

| Name    | Type    | Description      |
| ------- | ------- | ---------------- |
| account | address | Address to query |

#### Return Values

| Name | Type    | Description                            |
| ---- | ------- | -------------------------------------- |
| [0]  | uint256 | The debt of the account in asset units |

### debtOfExact

```solidity
function debtOfExact(address account) external view returns (uint256)
```

Debt owed by a particular account, in underlying units scaled up by shifting
INTERNAL_DEBT_PRECISION_SHIFT bits

#### Parameters

| Name    | Type    | Description      |
| ------- | ------- | ---------------- |
| account | address | Address to query |

#### Return Values

| Name | Type    | Description                                   |
| ---- | ------- | --------------------------------------------- |
| [0]  | uint256 | The debt of the account in internal precision |

### interestRate

```solidity
function interestRate() external view returns (uint256)
```

Retrieves the current interest rate for an asset

#### Return Values

| Name | Type    | Description                                               |
| ---- | ------- | --------------------------------------------------------- |
| [0]  | uint256 | The interest rate in yield-per-second, scaled by 10\*\*27 |

### interestAccumulator

```solidity
function interestAccumulator() external view returns (uint256)
```

Retrieves the current interest rate accumulator for an asset

#### Return Values

| Name | Type    | Description                                                 |
| ---- | ------- | ----------------------------------------------------------- |
| [0]  | uint256 | An opaque accumulator that increases as interest is accrued |

### dToken

```solidity
function dToken() external view returns (address)
```

Returns an address of the sidecar DToken

#### Return Values

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| [0]  | address | The address of the DToken |

### borrow

```solidity
function borrow(uint256 amount, address receiver) external returns (uint256)
```

Transfer underlying tokens from the vault to the sender, and increase sender's debt

#### Parameters

| Name     | Type    | Description                                                           |
| -------- | ------- | --------------------------------------------------------------------- |
| amount   | uint256 | Amount of assets to borrow (use max uint256 for all available tokens) |
| receiver | address | Account receiving the borrowed tokens                                 |

#### Return Values

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| [0]  | uint256 | Amount of assets borrowed |

### repay

```solidity
function repay(uint256 amount, address receiver) external returns (uint256)
```

Transfer underlying tokens from the sender to the vault, and decrease receiver's debt

#### Parameters

| Name     | Type    | Description                                                       |
| -------- | ------- | ----------------------------------------------------------------- |
| amount   | uint256 | Amount of debt to repay in assets (use max uint256 for full debt) |
| receiver | address | Account holding the debt to be repaid                             |

#### Return Values

| Name | Type    | Description             |
| ---- | ------- | ----------------------- |
| [0]  | uint256 | Amount of assets repaid |

### repayWithShares

```solidity
function repayWithShares(uint256 amount, address receiver) external returns (uint256 shares, uint256 debt)
```

Pay off liability with shares ("self-repay")

_Equivalent to withdrawing and repaying, but no assets are needed to be present in the vault_

#### Parameters

| Name     | Type    | Description                                                                               |
| -------- | ------- | ----------------------------------------------------------------------------------------- |
| amount   | uint256 | In asset units (use max uint256 to repay the debt in full or up to the available deposit) |
| receiver | address | Account to remove debt from by burning sender's shares                                    |

#### Return Values

| Name   | Type    | Description                      |
| ------ | ------- | -------------------------------- |
| shares | uint256 | Amount of shares burned          |
| debt   | uint256 | Amount of debt removed in assets |

### pullDebt

```solidity
function pullDebt(uint256 amount, address from) external returns (uint256)
```

Take over debt from another account

#### Parameters

| Name   | Type    | Description                                                                |
| ------ | ------- | -------------------------------------------------------------------------- |
| amount | uint256 | Amount of debt in asset units (use max uint256 for all the account's debt) |
| from   | address | Account to pull the debt from                                              |

#### Return Values

| Name | Type    | Description                           |
| ---- | ------- | ------------------------------------- |
| [0]  | uint256 | Amount of debt pulled in asset units. |

### flashLoan

```solidity
function flashLoan(uint256 amount, bytes data) external
```

Request a flash-loan. A onFlashLoan() callback in msg.sender will be invoked, which must repay the loan
to the main Euler address prior to returning.

#### Parameters

| Name   | Type    | Description                                                                                              |
| ------ | ------- | -------------------------------------------------------------------------------------------------------- |
| amount | uint256 | In asset units                                                                                           |
| data   | bytes   | Passed through to the onFlashLoan() callback, so contracts don't need to store transient data in storage |

### touch

```solidity
function touch() external
```

Updates interest accumulator and totalBorrows, credits reserves, re-targets interest rate, and logs
vault status

## ILiquidation

Interface of the EVault's Liquidation module

### checkLiquidation

```solidity
function checkLiquidation(address liquidator, address violator, address collateral) external view returns (uint256 maxRepay, uint256 maxYield)
```

Checks to see if a liquidation would be profitable, without actually doing anything

#### Parameters

| Name       | Type    | Description                                 |
| ---------- | ------- | ------------------------------------------- |
| liquidator | address | Address that will initiate the liquidation  |
| violator   | address | Address that may be in collateral violation |
| collateral | address | Collateral which is to be seized            |

#### Return Values

| Name     | Type    | Description                                                                                                             |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| maxRepay | uint256 | Max amount of debt that can be repaid, in asset units                                                                   |
| maxYield | uint256 | Yield in collateral corresponding to max allowed amount of debt to be repaid, in collateral balance (shares for vaults) |

### liquidate

```solidity
function liquidate(address violator, address collateral, uint256 repayAssets, uint256 minYieldBalance) external
```

Attempts to perform a liquidation

#### Parameters

| Name            | Type    | Description                                                                                                                                     |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| violator        | address | Address that may be in collateral violation                                                                                                     |
| collateral      | address | Collateral which is to be seized                                                                                                                |
| repayAssets     | uint256 | The amount of underlying debt to be transferred from violator to sender, in asset units (use max uint256 to repay the maximum possible amount). |
| minYieldBalance | uint256 | The minimum acceptable amount of collateral to be transferred from violator to sender, in collateral balance units (shares for vaults)          |

## IBalanceForwarder

Interface of the EVault's BalanceForwarder module

### balanceTrackerAddress

```solidity
function balanceTrackerAddress() external view returns (address)
```

Retrieve the address of rewards contract, tracking changes in account's balances

#### Return Values

| Name | Type    | Description                 |
| ---- | ------- | --------------------------- |
| [0]  | address | The balance tracker address |

### balanceForwarderEnabled

```solidity
function balanceForwarderEnabled(address account) external view returns (bool)
```

Retrieves boolean indicating if the account opted in to forward balance changes to the rewards contract

#### Parameters

| Name    | Type    | Description      |
| ------- | ------- | ---------------- |
| account | address | Address to query |

#### Return Values

| Name | Type | Description                          |
| ---- | ---- | ------------------------------------ |
| [0]  | bool | True if balance forwarder is enabled |

### enableBalanceForwarder

```solidity
function enableBalanceForwarder() external
```

Enables balance forwarding for the authenticated account

_Only the authenticated account can enable balance forwarding for itself
Should call the IBalanceTracker hook with the current account's balance_

### disableBalanceForwarder

```solidity
function disableBalanceForwarder() external
```

Disables balance forwarding for the authenticated account

_Only the authenticated account can disable balance forwarding for itself
Should call the IBalanceTracker hook with the account's balance of 0_

## IGovernance

Interface of the EVault's Governance module

### governorAdmin

```solidity
function governorAdmin() external view returns (address)
```

Retrieves the address of the governor

#### Return Values

| Name | Type    | Description          |
| ---- | ------- | -------------------- |
| [0]  | address | The governor address |

### feeReceiver

```solidity
function feeReceiver() external view returns (address)
```

Retrieves address of the governance fee receiver

#### Return Values

| Name | Type    | Description              |
| ---- | ------- | ------------------------ |
| [0]  | address | The fee receiver address |

### interestFee

```solidity
function interestFee() external view returns (uint16)
```

Retrieves the interest fee in effect for the vault

#### Return Values

| Name | Type   | Description                                                                 |
| ---- | ------ | --------------------------------------------------------------------------- |
| [0]  | uint16 | Amount of interest that is redirected as a fee, as a fraction scaled by 1e4 |

### interestRateModel

```solidity
function interestRateModel() external view returns (address)
```

Looks up an asset's currently configured interest rate model

#### Return Values

| Name | Type    | Description                                                                   |
| ---- | ------- | ----------------------------------------------------------------------------- |
| [0]  | address | Address of the interest rate contract or address zero to indicate 0% interest |

### protocolConfigAddress

```solidity
function protocolConfigAddress() external view returns (address)
```

Retrieves the ProtocolConfig address

#### Return Values

| Name | Type    | Description                 |
| ---- | ------- | --------------------------- |
| [0]  | address | The protocol config address |

### protocolFeeShare

```solidity
function protocolFeeShare() external view returns (uint256)
```

Retrieves the protocol fee share

#### Return Values

| Name | Type    | Description                                                                       |
| ---- | ------- | --------------------------------------------------------------------------------- |
| [0]  | uint256 | A percentage share of fees accrued belonging to the protocol. In wad scale (1e18) |

### protocolFeeReceiver

```solidity
function protocolFeeReceiver() external view returns (address)
```

Retrieves the address which will receive protocol's fees
The protocol fee receiver address

### caps

```solidity
function caps() external view returns (uint16 supplyCap, uint16 borrowCap)
```

Retrieves supply and borrow caps in AmountCap format

#### Return Values

| Name      | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| supplyCap | uint16 | The supply cap in AmountCap format |
| borrowCap | uint16 | The borrow cap in AmountCap format |

### LTVBorrow

```solidity
function LTVBorrow(address collateral) external view returns (uint16)
```

Retrieves the borrow LTV of the collateral, which is used to determine if the account is healthy during
account status checks.

#### Parameters

| Name       | Type    | Description                            |
| ---------- | ------- | -------------------------------------- |
| collateral | address | The address of the collateral to query |

#### Return Values

| Name | Type   | Description                |
| ---- | ------ | -------------------------- |
| [0]  | uint16 | Borrowing LTV in 1e4 scale |

### LTVLiquidation

```solidity
function LTVLiquidation(address collateral) external view returns (uint16)
```

Retrieves the current liquidation LTV, which is used to determine if the account is eligible for
liquidation

#### Parameters

| Name       | Type    | Description                            |
| ---------- | ------- | -------------------------------------- |
| collateral | address | The address of the collateral to query |

#### Return Values

| Name | Type   | Description                  |
| ---- | ------ | ---------------------------- |
| [0]  | uint16 | Liquidation LTV in 1e4 scale |

### LTVFull

```solidity
function LTVFull(address collateral) external view returns (uint16 borrowLTV, uint16 liquidationLTV, uint16 initialLiquidationLTV, uint48 targetTimestamp, uint32 rampDuration)
```

Retrieves LTV configuration for the collateral

#### Parameters

| Name       | Type    | Description      |
| ---------- | ------- | ---------------- |
| collateral | address | Collateral asset |

#### Return Values

| Name                  | Type   | Description                                                                                               |
| --------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| borrowLTV             | uint16 | The current value of borrow LTV for originating positions                                                 |
| liquidationLTV        | uint16 | The value of fully converged liquidation LTV                                                              |
| initialLiquidationLTV | uint16 | The initial value of the liquidation LTV, when the ramp began                                             |
| targetTimestamp       | uint48 | The timestamp when the liquidation LTV is considered fully converged                                      |
| rampDuration          | uint32 | The time it takes for the liquidation LTV to converge from the initial value to the fully converged value |

### LTVList

```solidity
function LTVList() external view returns (address[])
```

Retrieves a list of collaterals with configured LTVs

_Returned assets could have the ltv disabled (set to zero)_

#### Return Values

| Name | Type      | Description               |
| ---- | --------- | ------------------------- |
| [0]  | address[] | List of asset collaterals |

### maxLiquidationDiscount

```solidity
function maxLiquidationDiscount() external view returns (uint16)
```

Retrieves the maximum liquidation discount

#### Return Values

| Name | Type   | Description                                   |
| ---- | ------ | --------------------------------------------- |
| [0]  | uint16 | The maximum liquidation discount in 1e4 scale |

### liquidationCoolOffTime

```solidity
function liquidationCoolOffTime() external view returns (uint16)
```

Retrieves liquidation cool-off time, which must elapse after successful account status check before
account can be liquidated

#### Return Values

| Name | Type   | Description                              |
| ---- | ------ | ---------------------------------------- |
| [0]  | uint16 | The liquidation cool off time in seconds |

### hookConfig

```solidity
function hookConfig() external view returns (address hookTarget, uint32 hookedOps)
```

Retrieves a hook target and a bitmask indicating which operations call the hook target

#### Return Values

| Name       | Type    | Description                                                                                    |
| ---------- | ------- | ---------------------------------------------------------------------------------------------- |
| hookTarget | address | Address of the hook target contract                                                            |
| hookedOps  | uint32  | Bitmask with operations that should call the hooks. See Constants.sol for a list of operations |

### configFlags

```solidity
function configFlags() external view returns (uint32)
```

Retrieves a bitmask indicating enabled config flags

#### Return Values

| Name | Type   | Description                       |
| ---- | ------ | --------------------------------- |
| [0]  | uint32 | Bitmask with config flags enabled |

### EVC

```solidity
function EVC() external view returns (address)
```

Address of EthereumVaultConnector contract

#### Return Values

| Name | Type    | Description     |
| ---- | ------- | --------------- |
| [0]  | address | The EVC address |

### unitOfAccount

```solidity
function unitOfAccount() external view returns (address)
```

Retrieves a reference asset used for liquidity calculations

#### Return Values

| Name | Type    | Description                        |
| ---- | ------- | ---------------------------------- |
| [0]  | address | The address of the reference asset |

### oracle

```solidity
function oracle() external view returns (address)
```

Retrieves the address of the oracle contract

#### Return Values

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| [0]  | address | The address of the oracle |

### permit2Address

```solidity
function permit2Address() external view returns (address)
```

Retrieves the Permit2 contract address

#### Return Values

| Name | Type    | Description                         |
| ---- | ------- | ----------------------------------- |
| [0]  | address | The address of the Permit2 contract |

### convertFees

```solidity
function convertFees() external
```

Splits accrued fees balance according to protocol fee share and transfers shares to the governor fee
receiver and protocol fee receiver

### setGovernorAdmin

```solidity
function setGovernorAdmin(address newGovernorAdmin) external
```

Set a new governor address

_Set to zero address to renounce privileges and make the vault non-governed_

#### Parameters

| Name             | Type    | Description              |
| ---------------- | ------- | ------------------------ |
| newGovernorAdmin | address | The new governor address |

### setFeeReceiver

```solidity
function setFeeReceiver(address newFeeReceiver) external
```

Set a new governor fee receiver address

#### Parameters

| Name           | Type    | Description                  |
| -------------- | ------- | ---------------------------- |
| newFeeReceiver | address | The new fee receiver address |

### setLTV

```solidity
function setLTV(address collateral, uint16 borrowLTV, uint16 liquidationLTV, uint32 rampDuration) external
```

Set a new LTV config

#### Parameters

| Name           | Type    | Description                                                                               |
| -------------- | ------- | ----------------------------------------------------------------------------------------- |
| collateral     | address | Address of collateral to set LTV for                                                      |
| borrowLTV      | uint16  | New borrow LTV, for assessing account's health during account status checks, in 1e4 scale |
| liquidationLTV | uint16  | New liquidation LTV after ramp ends in 1e4 scale                                          |
| rampDuration   | uint32  | Ramp duration in seconds                                                                  |

### clearLTV

```solidity
function clearLTV(address collateral) external
```

Completely clears LTV configuratrion, signalling the collateral is not considered safe to liquidate
anymore

#### Parameters

| Name       | Type    | Description               |
| ---------- | ------- | ------------------------- |
| collateral | address | Address of the collateral |

### setMaxLiquidationDiscount

```solidity
function setMaxLiquidationDiscount(uint16 newDiscount) external
```

Set a new maximum liquidation discount

_If the discount is zero (the default), the liquidators will not be incentivized to liquidate unhealthy
accounts_

#### Parameters

| Name        | Type   | Description                                   |
| ----------- | ------ | --------------------------------------------- |
| newDiscount | uint16 | New maximum liquidation discount in 1e4 scale |

### setLiquidationCoolOffTime

```solidity
function setLiquidationCoolOffTime(uint16 newCoolOffTime) external
```

Set a new liquidation cool off time, which must elapse after successful account status check before
account can be liquidated

_Setting cool off time to zero allows liquidating the account in the same block as the last successful
account status check_

#### Parameters

| Name           | Type   | Description                                  |
| -------------- | ------ | -------------------------------------------- |
| newCoolOffTime | uint16 | The new liquidation cool off time in seconds |

### setInterestRateModel

```solidity
function setInterestRateModel(address newModel) external
```

Set a new interest rate model contract

#### Parameters

| Name     | Type    | Description         |
| -------- | ------- | ------------------- |
| newModel | address | The new IRM address |

### setHookConfig

```solidity
function setHookConfig(address newHookTarget, uint32 newHookedOps) external
```

Set a new hook target and a new bitmap indicating which operations should call the hook target.
Operations are defined in Constants.sol

#### Parameters

| Name          | Type    | Description                            |
| ------------- | ------- | -------------------------------------- |
| newHookTarget | address | The new hook target address            |
| newHookedOps  | uint32  | Bitmask with the new hooked operations |

### setConfigFlags

```solidity
function setConfigFlags(uint32 newConfigFlags) external
```

Set new bitmap indicating which config flags should be enabled. Flags are defined in Constants.sol

#### Parameters

| Name           | Type   | Description                       |
| -------------- | ------ | --------------------------------- |
| newConfigFlags | uint32 | Bitmask with the new config flags |

### setCaps

```solidity
function setCaps(uint16 supplyCap, uint16 borrowCap) external
```

Set new supply and borrow caps in AmountCap format

#### Parameters

| Name      | Type   | Description                            |
| --------- | ------ | -------------------------------------- |
| supplyCap | uint16 | The new supply cap in AmountCap fromat |
| borrowCap | uint16 | The new borrow cap in AmountCap fromat |

### setInterestFee

```solidity
function setInterestFee(uint16 newFee) external
```

Set a new interest fee

#### Parameters

| Name   | Type   | Description          |
| ------ | ------ | -------------------- |
| newFee | uint16 | The new interest fee |

## IEVault

Interface of the EVault, an EVC enabled lending vault

### MODULE_INITIALIZE

```solidity
function MODULE_INITIALIZE() external view returns (address)
```

Fetch address of the `Initialize` module

### MODULE_TOKEN

```solidity
function MODULE_TOKEN() external view returns (address)
```

Fetch address of the `Token` module

### MODULE_VAULT

```solidity
function MODULE_VAULT() external view returns (address)
```

Fetch address of the `Vault` module

### MODULE_BORROWING

```solidity
function MODULE_BORROWING() external view returns (address)
```

Fetch address of the `Borrowing` module

### MODULE_LIQUIDATION

```solidity
function MODULE_LIQUIDATION() external view returns (address)
```

Fetch address of the `Liquidation` module

### MODULE_RISKMANAGER

```solidity
function MODULE_RISKMANAGER() external view returns (address)
```

Fetch address of the `RiskManager` module

### MODULE_BALANCE_FORWARDER

```solidity
function MODULE_BALANCE_FORWARDER() external view returns (address)
```

Fetch address of the `BalanceForwarder` module

### MODULE_GOVERNANCE

```solidity
function MODULE_GOVERNANCE() external view returns (address)
```

Fetch address of the `Governance` module
