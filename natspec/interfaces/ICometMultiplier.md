# Solidity API

## InvalidWeth

```solidity
error InvalidWeth()
```

## ICometMultiplier

### UnknownMarket

```solidity
error UnknownMarket()
```

### InvalidLeverage

```solidity
error InvalidLeverage()
```

### CallbackFailed

```solidity
error CallbackFailed()
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

### InvalidAmountIn

```solidity
error InvalidAmountIn()
```

### Mode

Operation modes for the multiplier adapter

```solidity
enum Mode {
  EXECUTE,
  WITHDRAW
}
```

### Executed

```solidity
event Executed(address user, address comet, address collateral, uint256 totalAmount, uint256 debtAmount)
```

Emitted when a leveraged position is executed or withdrawn

#### Parameters

| Name        | Type    | Description                                          |
| ----------- | ------- | ---------------------------------------------------- |
| user        | address | The address of the user performing the operation     |
| comet       | address | The address of the Compound V3 Comet market          |
| collateral  | address | The address of the collateral asset involved         |
| totalAmount | uint256 | The total amount of collateral supplied or withdrawn |
| debtAmount  | uint256 | The amount of debt borrowed or repaid                |

### Withdrawn

```solidity
event Withdrawn(address user, address comet, address collateral, uint256 withdrawnAmount, uint256 baseReturned)
```

Emitted when collateral is withdrawn from a leveraged position

#### Parameters

| Name            | Type    | Description                                                       |
| --------------- | ------- | ----------------------------------------------------------------- |
| user            | address | The address of the user performing the withdrawal                 |
| comet           | address | The address of the Compound V3 Comet market                       |
| collateral      | address | The address of the collateral asset withdrawn                     |
| withdrawnAmount | uint256 | The amount of collateral tokens withdrawn                         |
| baseReturned    | uint256 | The amount of base asset returned to the user after repaying debt |

### executeMultiplier

```solidity
function executeMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, uint256 minAmountOut) external payable
```

Creates a leveraged position by borrowing against supplied collateral

\_This function:

1. Validates the flash loan plugin exists
2. Calculates the required loan amount based on leverage
3. Transfers user's collateral to the contract
4. Initiates a flash loan to execute the leveraged position\_

#### Parameters

| Name             | Type                            | Description                                                                |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                 | Address of the collateral token to supply                                  |
| collateralAmount | uint256                         | Amount of collateral tokens to supply                                      |
| leverage         | uint256                         | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                           | Encoded swap parameters for the DEX aggregator                             |
| minAmountOut     | uint256                         | Minimum amount of collateral tokens expected from the swap                 |

### executeMultiplierBySig

```solidity
function executeMultiplierBySig(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, uint256 minAmountOut, struct IAllowBySig.AllowParams allowParams) external payable
```

Creates a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then executes the position_

#### Parameters

| Name             | Type                            | Description                                                                |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                 | Address of the collateral token to supply                                  |
| collateralAmount | uint256                         | Amount of collateral tokens to supply                                      |
| leverage         | uint256                         | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                           | Encoded swap parameters for the DEX aggregator                             |
| minAmountOut     | uint256                         | Minimum amount of collateral tokens expected from the swap                 |
| allowParams      | struct IAllowBySig.AllowParams  | EIP-712 signature parameters for Comet authorization                       |

### withdrawMultiplier

```solidity
function withdrawMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData, uint256 minAmountOut) external
```

Reduces or closes a leveraged position by withdrawing collateral and repaying debt

\_This function:

1. Checks that the user has an outstanding borrow balance
2. Calculates the maximum withdrawable amount based on collateralization
3. Initiates a flash loan to temporarily repay debt and withdraw collateral\_

#### Parameters

| Name             | Type                            | Description                                                                |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                 | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                         | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                           | Encoded swap parameters for converting collateral to base asset            |
| minAmountOut     | uint256                         | Minimum amount of base asset expected from the swap                        |

### withdrawMultiplierBySig

```solidity
function withdrawMultiplierBySig(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData, uint256 minAmountOut, struct IAllowBySig.AllowParams allowParams) external
```

Reduces or closes a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then withdraws the position_

#### Parameters

| Name             | Type                            | Description                                                                |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                 | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                         | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                           | Encoded swap parameters for converting collateral to base asset            |
| minAmountOut     | uint256                         | Minimum amount of base asset expected from the swap                        |
| allowParams      | struct IAllowBySig.AllowParams  | EIP-712 signature parameters for Comet authorization                       |

### wEth

```solidity
function wEth() external view returns (address)
```

Returns the address of the WETH token used for wrapping/unwrapping ETH
