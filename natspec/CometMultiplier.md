# Solidity API

## CometMultiplier

A leveraged position manager for Compound V3 (Comet) markets that enables users to
create and unwind leveraged positions using flash loans and token swaps

_This contract uses a plugin architecture to support different flash loan providers and DEX aggregators.
It leverages transient storage (EIP-1153) for gas-efficient temporary data storage during operations._

### wEth

```solidity
address wEth
```

Wrapped ETH (WETH) token address

### constructor

```solidity
constructor(struct ICometFoundation.Plugin[] _plugins, address _wEth) public payable
```

Initializes the CometMultiplier with plugins and WETH address

_Each plugin must have a valid non-zero callback selector_

#### Parameters

| Name      | Type                             | Description                                                                      |
| --------- | -------------------------------- | -------------------------------------------------------------------------------- |
| \_plugins | struct ICometFoundation.Plugin[] | Array of plugin configurations containing endpoints and their callback selectors |
| \_wEth    | address                          | Address of the WETH token contract for handling ETH wrapping/unwrapping          |

### fallback

```solidity
fallback() external payable
```

Handles flash loan callbacks from registered plugins

_This function is called by flash loan providers during the loan execution.
It validates the callback, decodes the data, and routes to appropriate execution logic._

### executeMultiplier

```solidity
function executeMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData) external payable
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

### executeMultiplierBySig

```solidity
function executeMultiplierBySig(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, struct ICometFoundation.AllowParams allowParams) external payable
```

Creates a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then executes the position_

#### Parameters

| Name             | Type                                | Description                                                                |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                     | Address of the collateral token to supply                                  |
| collateralAmount | uint256                             | Amount of collateral tokens to supply                                      |
| leverage         | uint256                             | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                               | Encoded swap parameters for the DEX aggregator                             |
| allowParams      | struct ICometFoundation.AllowParams | EIP-712 signature parameters for Comet authorization                       |

### withdrawMultiplier

```solidity
function withdrawMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData) external
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

### withdrawMultiplierBySig

```solidity
function withdrawMultiplierBySig(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData, struct ICometFoundation.AllowParams allowParams) external
```

Reduces or closes a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then withdraws the position_

#### Parameters

| Name             | Type                                | Description                                                                |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                     | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                             | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                               | Encoded swap parameters for converting collateral to base asset            |
| allowParams      | struct ICometFoundation.AllowParams | EIP-712 signature parameters for Comet authorization                       |

### \_executeMultiplier

```solidity
function _executeMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData) internal
```

Internal implementation of executeMultiplier

### \_withdrawMultiplier

```solidity
function _withdrawMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData) internal
```

Internal implementation of withdrawMultiplier

### \_transferDust

```solidity
function _transferDust(contract IERC20 token, address to, uint256 amount) internal
```

Transfers dust (leftover tokens) to a specified address

#### Parameters

| Name   | Type            | Description                      |
| ------ | --------------- | -------------------------------- |
| token  | contract IERC20 | The ERC20 token to transfer      |
| to     | address         | The recipient address            |
| amount | uint256         | The amount of tokens to transfer |

### \_leveraged

```solidity
function _leveraged(contract IComet comet, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage) internal view returns (uint256)
```

Calculates the required loan amount for a given leverage ratio

_Formula: loan = (initialValue \* (leverage - 1)) / PRECISION_

#### Parameters

| Name             | Type            | Description                            |
| ---------------- | --------------- | -------------------------------------- |
| comet            | contract IComet | The Comet comet interface              |
| collateral       | contract IERC20 | Address of the collateral token        |
| collateralAmount | uint256         | Amount of collateral being supplied    |
| leverage         | uint256         | Leverage multiplier (e.g., 20000 = 2x) |

#### Return Values

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| [0]  | uint256 | Required loan amount in base asset terms |

### \_convert

```solidity
function _convert(contract IComet comet, contract IERC20 collateral, uint256 collateralAmount) internal view returns (uint256)
```

Converts between collateral and base asset amounts using comet prices

_Accounts for collateral factors and price feed decimals in conversions_

#### Parameters

| Name             | Type            | Description                     |
| ---------------- | --------------- | ------------------------------- |
| comet            | contract IComet | The Comet comet interface       |
| collateral       | contract IERC20 | Address of the collateral token |
| collateralAmount | uint256         | Amount to convert               |

#### Return Values

| Name | Type    | Description                                 |
| ---- | ------- | ------------------------------------------- |
| [0]  | uint256 | Converted amount in the target denomination |

### \_tstore

```solidity
function _tstore(uint256 snapshot, address loanPlugin, address swapPlugin, contract IComet comet, contract IERC20 collateral, uint256 amount, address user, enum ICometFoundation.Mode mode) internal
```

Stores operation parameters in transient storage for callback access

_Uses EIP-1153 transient storage for gas-efficient temporary data storage_

#### Parameters

| Name       | Type                       | Description                                  |
| ---------- | -------------------------- | -------------------------------------------- |
| snapshot   | uint256                    | Base asset balance before flash loan         |
| loanPlugin | address                    |                                              |
| swapPlugin | address                    | Address of the swap plugin                   |
| comet      | contract IComet            | Address of the Comet comet                   |
| collateral | contract IERC20            | Address of the collateral token              |
| amount     | uint256                    | Collateral amount being processed            |
| user       | address                    | Address of the user performing the operation |
| mode       | enum ICometFoundation.Mode | Operation mode (EXECUTE or WITHDRAW)         |

### \_tloadFirst

```solidity
function _tloadFirst() internal returns (enum ICometFoundation.Mode mode, uint256 snapshot, address loanPlugin)
```

Retrieves and clears first operation parameters from transient storage

_Automatically clears the storage slots after reading to prevent reuse_

#### Return Values

| Name       | Type                       | Description                          |
| ---------- | -------------------------- | ------------------------------------ |
| mode       | enum ICometFoundation.Mode | Operation mode (EXECUTE or WITHDRAW) |
| snapshot   | uint256                    | Base asset balance before flash loan |
| loanPlugin | address                    | Address of the flashloan plugin      |

### \_tloadSecond

```solidity
function _tloadSecond() internal returns (address swapPlugin, contract IComet comet, contract IERC20 collateral, uint256 amount, address user)
```

Retrieves and clears second operation parameters from transient storage

_Automatically clears the storage slots after reading to prevent reuse_

#### Return Values

| Name       | Type            | Description                                  |
| ---------- | --------------- | -------------------------------------------- |
| swapPlugin | address         | Address of the swap plugin                   |
| comet      | contract IComet | Address of the Comet comet                   |
| collateral | contract IERC20 | Address of the collateral token              |
| amount     | uint256         | Collateral amount being processed            |
| user       | address         | Address of the user performing the operation |
