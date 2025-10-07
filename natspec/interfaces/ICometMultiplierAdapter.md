# Solidity API

## ICometMultiplierAdapter

### UnsupportedPriceFeed

```solidity
error UnsupportedPriceFeed()
```

### UnknownCallbackSelector

```solidity
error UnknownCallbackSelector()
```

### UnknownMarket

```solidity
error UnknownMarket()
```

### InvalidPluginSelector

```solidity
error InvalidPluginSelector()
```

### InvalidLeverage

```solidity
error InvalidLeverage()
```

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

### InvalidAsset

```solidity
error InvalidAsset()
```

### CallbackFailed

```solidity
error CallbackFailed()
```

### FlashLoanFailed

```solidity
error FlashLoanFailed()
```

### InvalidMode

```solidity
error InvalidMode()
```

### AlreadyExists

```solidity
error AlreadyExists()
```

### NothingToDeleverage

```solidity
error NothingToDeleverage()
```

### InvalidCollateralAmount

```solidity
error InvalidCollateralAmount()
```

### Mode

```solidity
enum Mode {
  EXECUTE,
  WITHDRAW
}
```

### Plugin

```solidity
struct Plugin {
  address endpoint;
  bytes config;
}
```

### Options

```solidity
struct Options {
  address market;
  address flp;
  bytes4 loanSelector;
  bytes4 swapSelector;
}
```

### AssetAdded

```solidity
event AssetAdded(address collateralAsset, bytes4 pluginSelector)
```

### PluginAdded

```solidity
event PluginAdded(address plugin, bytes4 pluginSelector)
```

### Executed

```solidity
event Executed(address user, contract IComet market, address collateral, uint256 totalAmount, uint256 debtAmount)
```

### Withdrawn

```solidity
event Withdrawn(address user, contract IComet market, address collateral, uint256 withdrawnAmount, uint256 baseReturned)
```

### wEth

```solidity
function wEth() external view returns (address)
```

### executeMultiplier

```solidity
function executeMultiplier(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, uint256 minAmountOut) external payable
```

Creates a leveraged position by borrowing against supplied collateral

\_This function:

1. Validates the flash loan plugin exists
2. Calculates the required loan amount based on leverage
3. Transfers user's collateral to the contract
4. Initiates a flash loan to execute the leveraged position\_

#### Parameters

| Name             | Type                                   | Description                                                                |
| ---------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometMultiplierAdapter.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | address                                | Address of the collateral token to supply                                  |
| collateralAmount | uint256                                | Amount of collateral tokens to supply                                      |
| leverage         | uint256                                | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                                  | Encoded swap parameters for the DEX aggregator                             |
| minAmountOut     | uint256                                | Minimum amount of collateral tokens expected from the swap                 |

### executeMultiplierBySig

```solidity
function executeMultiplierBySig(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, uint256 minAmountOut, struct IAllowBySig.AllowParams allowParams) external payable
```

Creates a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then executes the position_

#### Parameters

| Name             | Type                                   | Description                                                                |
| ---------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometMultiplierAdapter.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | address                                | Address of the collateral token to supply                                  |
| collateralAmount | uint256                                | Amount of collateral tokens to supply                                      |
| leverage         | uint256                                | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                                  | Encoded swap parameters for the DEX aggregator                             |
| minAmountOut     | uint256                                | Minimum amount of collateral tokens expected from the swap                 |
| allowParams      | struct IAllowBySig.AllowParams         | EIP-712 signature parameters for Comet authorization                       |

### withdrawMultiplier

```solidity
function withdrawMultiplier(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 collateralAmount, bytes swapData, uint256 minAmountOut) external
```

Reduces or closes a leveraged position by withdrawing collateral and repaying debt

\_This function:

1. Checks that the user has an outstanding borrow balance
2. Calculates the maximum withdrawable amount based on collateralization
3. Initiates a flash loan to temporarily repay debt and withdraw collateral\_

#### Parameters

| Name             | Type                                   | Description                                                                |
| ---------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometMultiplierAdapter.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | address                                | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                                | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                                  | Encoded swap parameters for converting collateral to base asset            |
| minAmountOut     | uint256                                | Minimum amount of base asset expected from the swap                        |

### withdrawMultiplierBySig

```solidity
function withdrawMultiplierBySig(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 collateralAmount, bytes swapData, uint256 minAmountOut, struct IAllowBySig.AllowParams allowParams) external
```

Reduces or closes a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then withdraws the position_

#### Parameters

| Name             | Type                                   | Description                                                                |
| ---------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometMultiplierAdapter.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | address                                | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                                | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                                  | Encoded swap parameters for converting collateral to base asset            |
| minAmountOut     | uint256                                | Minimum amount of base asset expected from the swap                        |
| allowParams      | struct IAllowBySig.AllowParams         | EIP-712 signature parameters for Comet authorization                       |
