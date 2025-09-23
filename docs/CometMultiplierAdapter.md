# Solidity API

## CometMultiplierAdapter

A leveraged position manager for Compound V3 (Comet) markets that enables users to
        create and unwind leveraged positions using flash loans and token swaps

_This contract uses a plugin architecture to support different flash loan providers and DEX aggregators.
     It leverages transient storage (EIP-1153) for gas-efficient temporary data storage during operations._

### LEVERAGE_PRECISION

```solidity
uint256 LEVERAGE_PRECISION
```

Precision constant for leverage calculations (represents 1x leverage)

### MAX_LEVERAGE

```solidity
uint256 MAX_LEVERAGE
```

Maximum allowed leverage multiplier (5x leverage)

### SLOT_ADAPTER

```solidity
bytes32 SLOT_ADAPTER
```

Storage slot for transient data, derived from contract name hash

### plugins

```solidity
mapping(bytes4 => struct ICometMultiplierAdapter.Plugin) plugins
```

Mapping of function selectors to their corresponding plugin configurations

_Key is the callback selector, value contains plugin endpoint and configuration_

### constructor

```solidity
constructor(struct ICometMultiplierAdapter.Plugin[] _plugins) public
```

Initializes the adapter with flash loan and swap plugins

_Each plugin must have a valid non-zero callback selector_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _plugins | struct ICometMultiplierAdapter.Plugin[] | Array of plugin configurations containing endpoints and their callback selectors |

### fallback

```solidity
fallback() external payable
```

Handles flash loan callbacks from registered plugins

_This function is called by flash loan providers during the loan execution.
     It validates the callback, decodes the data, and routes to appropriate execution logic._

### receive

```solidity
receive() external payable
```

Allows the contract to receive ETH

_Required for receiving ETH from WETH unwrapping or native ETH operations_

### executeMultiplier

```solidity
function executeMultiplier(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, uint256 minAmountOut) external
```

Creates a leveraged position by borrowing against supplied collateral

_This function:
     1. Validates the flash loan plugin exists
     2. Calculates the required loan amount based on leverage
     3. Transfers user's collateral to the contract
     4. Initiates a flash loan to execute the leveraged position_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| opts | struct ICometMultiplierAdapter.Options | Configuration options including market, selectors, and flash loan provider |
| collateral | address | Address of the collateral token to supply |
| collateralAmount | uint256 | Amount of collateral tokens to supply |
| leverage | uint256 | Leverage multiplier (e.g., 20000 = 2x leverage) |
| swapData | bytes | Encoded swap parameters for the DEX aggregator |
| minAmountOut | uint256 | Minimum amount of collateral tokens expected from the swap |

### withdrawMultiplier

```solidity
function withdrawMultiplier(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 collateralAmount, bytes swapData, uint256 minAmountOut) external
```

Reduces or closes a leveraged position by withdrawing collateral and repaying debt

_This function:
     1. Checks that the user has an outstanding borrow balance
     2. Calculates the maximum withdrawable amount based on collateralization
     3. Initiates a flash loan to temporarily repay debt and withdraw collateral_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| opts | struct ICometMultiplierAdapter.Options | Configuration options including market, selectors, and flash loan provider |
| collateral | address | Address of the collateral token to withdraw |
| collateralAmount | uint256 | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData | bytes | Encoded swap parameters for converting collateral to base asset |
| minAmountOut | uint256 | Minimum amount of base asset expected from the swap |

### _swap

```solidity
function _swap(address srcToken, address dstToken, uint256 amount, uint256 minAmountOut, bytes4 swapSelector, bytes swapData) internal returns (uint256 amountOut)
```

Executes a token swap using the configured swap plugin

_Uses delegatecall to execute swap in the context of this contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| srcToken | address | Address of the source token to swap from |
| dstToken | address | Address of the destination token to swap to |
| amount | uint256 | Amount of source tokens to swap |
| minAmountOut | uint256 | Minimum amount of destination tokens expected |
| swapSelector | bytes4 | Function selector of the swap plugin to use |
| swapData | bytes | Encoded parameters for the swap execution |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | Actual amount of destination tokens received |

### _loan

```solidity
function _loan(address endpoint, struct ICometFlashLoanPlugin.CallbackData data, bytes config) internal
```

Initiates a flash loan using the specified plugin

_Uses delegatecall to execute the flash loan in this contract's context_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| endpoint | address | Address of the flash loan plugin |
| data | struct ICometFlashLoanPlugin.CallbackData | Callback data to be passed to the flash loan callback |
| config | bytes | Plugin-specific configuration data |

### _leveraged

```solidity
function _leveraged(contract IComet comet, address collateralAsset, uint256 initialAmount, uint256 leverage) internal view returns (uint256)
```

Calculates the required loan amount for a given leverage ratio

_Formula: loan = (initialValue * (leverage - 1)) / LEVERAGE_PRECISION_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | contract IComet | The Comet market interface |
| collateralAsset | address | Address of the collateral token |
| initialAmount | uint256 | Initial amount of collateral being supplied |
| leverage | uint256 | Leverage multiplier (e.g., 20000 = 2x) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Required loan amount in base asset terms |

### _convert

```solidity
function _convert(contract IComet comet, address col, uint256 amount, bool debtToCollateral) internal view returns (uint256)
```

Converts between collateral and base asset amounts using market prices

_Accounts for collateral factors and price feed decimals in conversions_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | contract IComet | The Comet market interface |
| col | address | Address of the collateral token |
| amount | uint256 | Amount to convert |
| debtToCollateral | bool | Direction of conversion (true: debt→collateral, false: collateral→debt) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Converted amount in the target denomination |

### _scale

```solidity
function _scale(address priceFeed, uint256 scale) internal view returns (uint256)
```

Calculates the scaling factor for price feed decimals

_Used to normalize prices across different decimal precisions_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Address of the Chainlink price feed |
| scale | uint256 | Token's native scaling factor |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Combined scaling factor for price calculations |

### _tstore

```solidity
function _tstore(uint256 amount, address market, address collateral, uint256 minAmountOut, bytes4 swapSelector, enum ICometMultiplierAdapter.Mode mode) internal
```

Stores operation parameters in transient storage for callback access

_Uses EIP-1153 transient storage for gas-efficient temporary data storage_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Collateral amount being processed |
| market | address | Address of the Comet market |
| collateral | address | Address of the collateral token |
| minAmountOut | uint256 | Minimum expected output amount |
| swapSelector | bytes4 | Function selector for the swap plugin |
| mode | enum ICometMultiplierAdapter.Mode | Operation mode (EXECUTE or WITHDRAW) |

### _tload

```solidity
function _tload() internal returns (uint256 amount, address market, address collateral, uint256 minAmountOut, bytes4 swapSelector)
```

Retrieves and clears operation parameters from transient storage

_Automatically clears the storage slots after reading to prevent reuse_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Collateral amount being processed |
| market | address | Address of the Comet market |
| collateral | address | Address of the collateral token |
| minAmountOut | uint256 | Minimum expected output amount |
| swapSelector | bytes4 | Function selector for the swap plugin |

### _catch

```solidity
function _catch(bool success) internal pure
```

Handles failed external calls by reverting with the original error

_Preserves the original revert reason when delegatecalls or external calls fail_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Boolean indicating if the external call succeeded |

