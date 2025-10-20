# Solidity API

## CometFoundation

This contract serves as a foundational component for managing plugins that facilitate flash loans and token swaps.
It maintains a registry of supported plugins, each identified by a unique key derived from the plugin's address and callback selector.
The contract provides internal functions to validate and interact with these plugins, ensuring secure and modular integration with various DeFi protocols.

### FACTOR_SCALE

```solidity
uint64 FACTOR_SCALE
```

_The scale for factors_

### PRECISION

```solidity
uint16 PRECISION
```

### PLUGIN_MAGIC

```solidity
bytes1 PLUGIN_MAGIC
```

Magic byte to identify valid plugin calls

### SNAPSHOT_OFFSET

```solidity
uint8 SNAPSHOT_OFFSET
```

Offset constants for transient storage slots

### LOAN_PLUGIN_OFFSET

```solidity
uint8 LOAN_PLUGIN_OFFSET
```

### SWAP_PLUGIN_OFFSET

```solidity
uint8 SWAP_PLUGIN_OFFSET
```

### MARKET_OFFSET

```solidity
uint8 MARKET_OFFSET
```

### ASSET_OFFSET

```solidity
uint8 ASSET_OFFSET
```

### AMOUNT_OFFSET

```solidity
uint8 AMOUNT_OFFSET
```

### USER_OFFSET

```solidity
uint8 USER_OFFSET
```

### SLOT_FOUNDATION

```solidity
bytes32 SLOT_FOUNDATION
```

Storage slot for transient data, derived from contract name hash

### wEth

```solidity
address wEth
```

Wrapped ETH (WETH) token address

### plugins

```solidity
mapping(bytes32 => bytes) plugins
```

Mapping of function selectors to their corresponding plugin configurations

_Key is the callback selector, value contains plugin endpoint and configuration_

### receive

```solidity
receive() external payable
```

Allows the contract to receive ETH

_Required for receiving ETH from WETH unwrapping or native ETH operations_

### fallback

```solidity
fallback() external payable
```

Fallback function to handle plugin calls via delegatecall

_This function processes calls to flash loan and swap plugins, managing the entire lifecycle of a flash loan operation.
It retrieves transient data from storage, validates the call, and orchestrates the flash loan process including swaps and collateral management._

### allow

```solidity
modifier allow(contract IComet comet, struct ICometStructs.AllowParams allowParams)
```

Modifier to handle Comet's allowBySig for gasless approvals

### constructor

```solidity
constructor(struct ICometStructs.Plugin[] _plugins, address _wEth) public payable
```

Initializes the adapter with flash loan and swap plugins

_Each plugin must have a valid non-zero callback selector_

#### Parameters

| Name      | Type                          | Description                                                                      |
| --------- | ----------------------------- | -------------------------------------------------------------------------------- |
| \_plugins | struct ICometStructs.Plugin[] | Array of plugin configurations containing endpoints and their callback selectors |
| \_wEth    | address                       | Address of the Wrapped ETH (WETH) token                                          |

### exchange

```solidity
function exchange(struct ICometStructs.Options opts, contract IERC20 fromAsset, contract IERC20 toAsset, uint256 fromAmount, uint256 minAmountOut, uint256 maxHealthFactorDrop, bytes swapData) external
```

Executes a collateral swap using flash loans

_The main entry point for swapping collateral assets in a Compound V3 position.
This function: 1. Validates swap parameters and health factor impact 2. Initiates a flash loan for the target asset amount 3. Supplies the borrowed asset to increase collateral 4. Withdraws the original collateral to be swapped 5. Swaps the withdrawn asset for the borrowed asset 6. Repays the flash loan plus any fees 7. Supplies any remaining dust back to the user's position_

#### Parameters

| Name                | Type                         | Description                                                                         |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| opts                | struct ICometStructs.Options | Configuration options including market, selectors, and flash loan provider          |
| fromAsset           | contract IERC20              | The address of the collateral asset to swap from (must be a valid Comet collateral) |
| toAsset             | contract IERC20              | The address of the collateral asset to swap to (must be a valid Comet collateral)   |
| fromAmount          | uint256                      | The amount of fromAsset to swap (must be <= user's collateral balance)              |
| minAmountOut        | uint256                      | The minimum amount of toAsset expected from the swap (slippage protection)          |
| maxHealthFactorDrop | uint256                      | Maximum allowed drop in health factor in basis points (10000 = 100%)                |
| swapData            | bytes                        | Encoded swap parameters for the DEX aggregator                                      |

### exchange

```solidity
function exchange(struct ICometStructs.Options opts, contract IERC20 fromAsset, contract IERC20 toAsset, uint256 fromAmount, uint256 minAmountOut, uint256 maxHealthFactorDrop, bytes swapData, struct ICometStructs.AllowParams allowParams) external
```

Executes a collateral swap with signature-based authorization in a single transaction

\_Combines Comet authorization via EIP-712 signature with collateral swap execution.
This allows users to authorize the contract and execute a swap atomically,
eliminating the need for a separate approve transaction.

     The function first validates and applies the signature-based authorization,
     then proceeds with the same swap logic as the regular swap function._

#### Parameters

| Name                | Type                             | Description                                                                         |
| ------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| opts                | struct ICometStructs.Options     | Configuration options including market, selectors, and flash loan provider          |
| fromAsset           | contract IERC20                  | The address of the collateral asset to swap from (must be a valid Comet collateral) |
| toAsset             | contract IERC20                  | The address of the collateral asset to swap to (must be a valid Comet collateral)   |
| fromAmount          | uint256                          | The amount of fromAsset to swap (must be <= user's collateral balance)              |
| minAmountOut        | uint256                          | The minimum amount of toAsset expected from the swap (slippage protection)          |
| maxHealthFactorDrop | uint256                          | Maximum allowed drop in health factor in basis points (10000 = 100%)                |
| swapData            | bytes                            | Encoded swap parameters for the DEX aggregator                                      |
| allowParams         | struct ICometStructs.AllowParams | EIP-712 signature parameters for Comet authorization                                |

### multiply

```solidity
function multiply(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData) external payable
```

Creates a leveraged position by borrowing against supplied collateral

\_This function:

1. Validates the flash loan plugin exists
2. Calculates the required loan amount based on leverage
3. Transfers user's collateral to the contract
4. Initiates a flash loan to execute the leveraged position\_

#### Parameters

| Name             | Type                         | Description                                                                |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20              | Address of the collateral token to supply                                  |
| collateralAmount | uint256                      | Amount of collateral tokens to supply                                      |
| leverage         | uint256                      | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                        | Encoded swap parameters for the DEX aggregator                             |

### multiply

```solidity
function multiply(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, struct ICometStructs.AllowParams allowParams) external payable
```

Creates a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then executes the position_

#### Parameters

| Name             | Type                             | Description                                                                |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                  | Address of the collateral token to supply                                  |
| collateralAmount | uint256                          | Amount of collateral tokens to supply                                      |
| leverage         | uint256                          | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                            | Encoded swap parameters for the DEX aggregator                             |
| allowParams      | struct ICometStructs.AllowParams | EIP-712 signature parameters for Comet authorization                       |

### cover

```solidity
function cover(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData) external
```

Reduces or closes a leveraged position by withdrawing collateral and repaying debt

\_This function:

1. Checks that the user has an outstanding borrow balance
2. Calculates the maximum withdrawable amount based on collateralization
3. Initiates a flash loan to temporarily repay debt and withdraw collateral\_

#### Parameters

| Name             | Type                         | Description                                                                |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20              | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                      | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                        | Encoded swap parameters for converting collateral to base asset            |

### cover

```solidity
function cover(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData, struct ICometStructs.AllowParams allowParams) external
```

Reduces or closes a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then withdraws the position_

#### Parameters

| Name             | Type                             | Description                                                                |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                  | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                          | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                            | Encoded swap parameters for converting collateral to base asset            |
| allowParams      | struct ICometStructs.AllowParams | EIP-712 signature parameters for Comet authorization                       |

### \_exchange

```solidity
function _exchange(struct ICometStructs.Options opts, contract IERC20 fromAsset, contract IERC20 toAsset, uint256 fromAmount, uint256 minAmountOut, uint256 maxHealthFactorDrop, bytes swapData) internal
```

Internal implementation of exchange

### \_multiply

```solidity
function _multiply(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData) internal
```

Internal implementation of multiply

### \_cover

```solidity
function _cover(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData) internal
```

Internal implementation of cover

### \_process

```solidity
function _process(contract IComet comet, address user, struct ICometStructs.ProcessParams params, struct ICometStructs.CallbackData data, address loanPlugin, address swapPlugin, enum ICometStructs.Mode mode) internal
```

Processes a flash loan operation including optional token swaps and collateral management

_This function orchestrates the entire flash loan \_process, including taking the loan,
performing swaps, supplying/withdrawing collateral, and repaying the loan.
It uses transient storage to maintain state across the flash loan callback._

#### Parameters

| Name       | Type                               | Description                                                      |
| ---------- | ---------------------------------- | ---------------------------------------------------------------- |
| comet      | contract IComet                    | The Comet market instance                                        |
| user       | address                            | The address of the user performing the operation                 |
| params     | struct ICometStructs.ProcessParams | Parameters for supplying and withdrawing collateral              |
| data       | struct ICometStructs.CallbackData  | Callback data containing flash loan details and swap information |
| loanPlugin | address                            | Address of the flash loan plugin to use                          |
| swapPlugin | address                            | Address of the swap plugin to use                                |
| mode       | enum ICometStructs.Mode            | Operation mode, either MULTIPLY (supply) or COVER                |

### \_supplyWithdraw

```solidity
function _supplyWithdraw(contract IComet comet, address user, struct ICometStructs.ProcessParams params) internal
```

Supplies and withdraws assets from the Comet market on behalf of a user

_This function handles the actual supply and withdrawal of assets in the Comet market._

#### Parameters

| Name   | Type                               | Description                                         |
| ------ | ---------------------------------- | --------------------------------------------------- |
| comet  | contract IComet                    | The Comet market instance                           |
| user   | address                            | The address of the user performing the operation    |
| params | struct ICometStructs.ProcessParams | Parameters for supplying and withdrawing collateral |

### \_swap

```solidity
function _swap(address swapPlugin, contract IERC20 srcToken, contract IERC20 dstToken, uint256 amount, bytes swapData) internal returns (uint256 amountOut)
```

Executes a token swap using the configured swap plugin

_Uses delegatecall to execute swap in the context of this contract_

#### Parameters

| Name       | Type            | Description                                 |
| ---------- | --------------- | ------------------------------------------- |
| swapPlugin | address         |                                             |
| srcToken   | contract IERC20 | Address of the source token to swap from    |
| dstToken   | contract IERC20 | Address of the destination token to swap to |
| amount     | uint256         | Amount of source tokens to swap             |
| swapData   | bytes           | Encoded parameters for the swap execution   |

#### Return Values

| Name      | Type    | Description                                  |
| --------- | ------- | -------------------------------------------- |
| amountOut | uint256 | Actual amount of destination tokens received |

### \_loan

```solidity
function _loan(address loanPlugin, struct ICometStructs.CallbackData data) internal
```

Initiates a flash loan using the specified plugin

_Uses delegatecall to execute the flash loan in this contract's context_

#### Parameters

| Name       | Type                              | Description                                           |
| ---------- | --------------------------------- | ----------------------------------------------------- |
| loanPlugin | address                           | Address of the flash loan plugin                      |
| data       | struct ICometStructs.CallbackData | Callback data to be passed to the flash loan callback |

### \_repay

```solidity
function _repay(address loanPlugin, address flp, contract IERC20 baseAsset, uint256 amount) internal
```

Repays a flash loan to the specified plugin

_Uses delegatecall to invoke the repay function on the flash loan plugin_

#### Parameters

| Name       | Type            | Description                             |
| ---------- | --------------- | --------------------------------------- |
| loanPlugin | address         |                                         |
| flp        | address         | Address of the flash loan provider      |
| baseAsset  | contract IERC20 | Address of the borrowed asset           |
| amount     | uint256         | Total amount to repay (principal + fee) |

### \_dust

```solidity
function _dust(address user, contract IERC20 asset, contract IComet comet, uint256 amount) internal
```

Handles any leftover tokens by either supplying to Comet or transferring to the user

_If comet is address(0), tokens are always transferred to user.
Otherwise, if asset is baseAsset, tokens are transferred; if collateral, they are supplied to Comet._

#### Parameters

| Name   | Type            | Description                                                    |
| ------ | --------------- | -------------------------------------------------------------- |
| user   | address         | Address of the user to receive leftover tokens                 |
| asset  | contract IERC20 | The ERC20 token to handle                                      |
| comet  | contract IComet | The Comet market instance (or address(0) if supply not needed) |
| amount | uint256         | Amount of tokens to handle                                     |

### \_validateExchange

```solidity
function _validateExchange(contract IComet comet, contract IERC20 fromAsset, contract IERC20 toAsset, uint256 fromAmount, uint256 minAmountOut, uint256 maxHealthFactorDrop) internal view
```

Validates parameters for a collateral swap to ensure health factor is maintained

_Reverts if any parameter is invalid or if the swap would violate health factor constraints_

#### Parameters

| Name                | Type            | Description                                               |
| ------------------- | --------------- | --------------------------------------------------------- |
| comet               | contract IComet | The Comet comet interface                                 |
| fromAsset           | contract IERC20 | The collateral asset being swapped from                   |
| toAsset             | contract IERC20 | The collateral asset being swapped to                     |
| fromAmount          | uint256         | The amount of fromAsset to swap                           |
| minAmountOut        | uint256         | The minimum acceptable amount of toAsset to receive       |
| maxHealthFactorDrop | uint256         | The maximum allowed drop in health factor in basis points |

### \_config

```solidity
function _config(address plugin, bytes4 selector) internal view returns (bytes config)
```

Retrieves and validates plugin configuration from storage

_Reverts if the plugin is unknown or the magic byte is invalid_

#### Parameters

| Name     | Type    | Description                               |
| -------- | ------- | ----------------------------------------- |
| plugin   | address | Address of the plugin contract            |
| selector | bytes4  | Callback function selector for the plugin |

#### Return Values

| Name   | Type  | Description                                  |
| ------ | ----- | -------------------------------------------- |
| config | bytes | Plugin configuration data without magic byte |

### \_catch

```solidity
function _catch(bool ok) internal pure
```

Handles failed external calls by reverting with the original error

_Preserves the original revert reason when delegatecalls or external calls fail_

#### Parameters

| Name | Type | Description                                       |
| ---- | ---- | ------------------------------------------------- |
| ok   | bool | Boolean indicating if the external call succeeded |

### \_tstore

```solidity
function _tstore(uint256 snapshot, address loanPlugin, address swapPlugin, contract IComet comet, contract IERC20 collateral, uint256 amount, address user, enum ICometStructs.Mode mode) internal
```

Stores operation parameters in transient storage for callback access

_Uses EIP-1153 transient storage for gas-efficient temporary data storage_

#### Parameters

| Name       | Type                    | Description                                  |
| ---------- | ----------------------- | -------------------------------------------- |
| snapshot   | uint256                 | Base asset balance before flash loan         |
| loanPlugin | address                 |                                              |
| swapPlugin | address                 | Address of the swap plugin                   |
| comet      | contract IComet         | Address of the Comet comet                   |
| collateral | contract IERC20         | Address of the collateral token              |
| amount     | uint256                 | Collateral amount being processed            |
| user       | address                 | Address of the user performing the operation |
| mode       | enum ICometStructs.Mode | Operation mode (MULTIPLY or COVER)           |

### \_tload

```solidity
function _tload() internal returns (uint256 snapshot, address loanPlugin, address swapPlugin, contract IComet comet, contract IERC20 collateral, uint256 amount, address user, enum ICometStructs.Mode mode)
```

Retrieves and clears first operation parameters from transient storages

_Automatically clears the storage slots after reading to prevent reuse_

#### Return Values

| Name       | Type                    | Description                                  |
| ---------- | ----------------------- | -------------------------------------------- |
| snapshot   | uint256                 | Base asset balance before flash loan         |
| loanPlugin | address                 | Address of the flashloan plugin              |
| swapPlugin | address                 | Address of the swap plugin                   |
| comet      | contract IComet         | Address of the Comet comet                   |
| collateral | contract IERC20         | Address of the collateral token              |
| amount     | uint256                 | Collateral amount being processed            |
| user       | address                 | Address of the user performing the operation |
| mode       | enum ICometStructs.Mode | Operation mode (MULTIPLY or COVER)           |
