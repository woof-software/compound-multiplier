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

### PRECEISION

```solidity
uint16 PRECEISION
```

### PLUGIN_MAGIC

```solidity
bytes1 PLUGIN_MAGIC
```

Magic byte to identify valid plugin calls

### LOAN_PLUGIN_OFFSET

```solidity
uint8 LOAN_PLUGIN_OFFSET
```

Offset constants for transient storage slots

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

### SLOT_FOUNDATION

```solidity
bytes32 SLOT_FOUNDATION
```

Storage slot for transient data, derived from contract name hash

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

### allow

```solidity
modifier allow(address comet, struct IAllowBySig.AllowParams allowParams)
```

Modifier to handle Comet's allowBySig for gasless approvals

### constructor

```solidity
constructor(struct ICometFoundation.Plugin[] _plugins) public
```

Initializes the adapter with flash loan and swap plugins

_Each plugin must have a valid non-zero callback selector_

#### Parameters

| Name      | Type                             | Description                                                                      |
| --------- | -------------------------------- | -------------------------------------------------------------------------------- |
| \_plugins | struct ICometFoundation.Plugin[] | Array of plugin configurations containing endpoints and their callback selectors |

### \_swap

```solidity
function _swap(address swapPlugin, address srcToken, address dstToken, uint256 amount, uint256 minAmountOut, bytes swapData) internal returns (uint256 amountOut)
```

Executes a token swap using the configured swap plugin

_Uses delegatecall to execute swap in the context of this contract_

#### Parameters

| Name         | Type    | Description                                   |
| ------------ | ------- | --------------------------------------------- |
| swapPlugin   | address |                                               |
| srcToken     | address | Address of the source token to swap from      |
| dstToken     | address | Address of the destination token to swap to   |
| amount       | uint256 | Amount of source tokens to swap               |
| minAmountOut | uint256 | Minimum amount of destination tokens expected |
| swapData     | bytes   | Encoded parameters for the swap execution     |

#### Return Values

| Name      | Type    | Description                                  |
| --------- | ------- | -------------------------------------------- |
| amountOut | uint256 | Actual amount of destination tokens received |

### \_loan

```solidity
function _loan(address endpoint, struct ICometFlashLoanPlugin.CallbackData data, bytes config) internal
```

Initiates a flash loan using the specified plugin

_Uses delegatecall to execute the flash loan in this contract's context_

#### Parameters

| Name     | Type                                      | Description                                           |
| -------- | ----------------------------------------- | ----------------------------------------------------- |
| endpoint | address                                   | Address of the flash loan plugin                      |
| data     | struct ICometFlashLoanPlugin.CallbackData | Callback data to be passed to the flash loan callback |
| config   | bytes                                     | Plugin-specific configuration data                    |

### \_repay

```solidity
function _repay(address endpoint, address flp, address baseAsset, uint256 amount) internal
```

Repays a flash loan to the specified plugin

_Uses delegatecall to invoke the repay function on the flash loan plugin_

#### Parameters

| Name      | Type    | Description                             |
| --------- | ------- | --------------------------------------- |
| endpoint  | address |                                         |
| flp       | address | Address of the flash loan provider      |
| baseAsset | address | Address of the borrowed asset           |
| amount    | uint256 | Total amount to repay (principal + fee) |

### \_validateLoan

```solidity
function _validateLoan(struct ICometFoundation.Options opts) internal view returns (bytes config)
```

Validates and extracts flashloan plugin config

_Reverts if plugin is not registered or magic byte is invalid_

#### Parameters

| Name | Type                            | Description                                           |
| ---- | ------------------------------- | ----------------------------------------------------- |
| opts | struct ICometFoundation.Options | Plugin options including endpoints and market details |

#### Return Values

| Name   | Type  | Description                             |
| ------ | ----- | --------------------------------------- |
| config | bytes | Plugin configuration without magic byte |

### \_validateSwap

```solidity
function _validateSwap(address swapPlugin) internal view returns (bytes config)
```

Validates and extracts swap plugin config

_Reverts if plugin is not registered or magic byte is invalid_

#### Parameters

| Name       | Type    | Description                |
| ---------- | ------- | -------------------------- |
| swapPlugin | address | Address of the swap plugin |

#### Return Values

| Name   | Type  | Description                             |
| ------ | ----- | --------------------------------------- |
| config | bytes | Plugin configuration without magic byte |

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
function _catch(bool success) internal pure
```

Handles failed external calls by reverting with the original error

_Preserves the original revert reason when delegatecalls or external calls fail_

#### Parameters

| Name    | Type | Description                                       |
| ------- | ---- | ------------------------------------------------- |
| success | bool | Boolean indicating if the external call succeeded |
