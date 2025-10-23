# Solidity API

## UniswapV4Plugin

Flash loan plugin for integrating Uniswap V4 PoolManager with CometMultiplier

_Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality_

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback function selector for Uniswap V4 unlock

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

Storage slot for transient flash loan validation

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometStructs.CallbackData data, bytes config) external payable
```

Initiates a flash loan

_config encodes PoolManager address_

#### Parameters

| Name   | Type                              | Description                                                              |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| data   | struct ICometStructs.CallbackData | Flash loan parameters including debt amount, asset, and user information |
| config | bytes                             |                                                                          |

### unlockCallback

```solidity
function unlockCallback(bytes data) external returns (struct ICometStructs.CallbackData _data)
```

Handles unlock callback from Uniswap V4 PoolManager

_Takes tokens from PoolManager and validates authorization_

#### Parameters

| Name | Type  | Description                                      |
| ---- | ----- | ------------------------------------------------ |
| data | bytes | Encoded callback data from flash loan initiation |

#### Return Values

| Name   | Type                              | Description                                  |
| ------ | --------------------------------- | -------------------------------------------- |
| \_data | struct ICometStructs.CallbackData | Decoded callback data for adapter processing |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

Repays the flash loan

_Settles the flash loan with PoolManager_

#### Parameters

| Name      | Type    | Description                              |
| --------- | ------- | ---------------------------------------- |
| flp       | address | Address of the flash loan provider       |
| baseAsset | address | Address of the borrowed asset            |
| amount    | uint256 | Total repayment amount (principal + fee) |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

Checks interface support

#### Parameters

| Name        | Type   | Description              |
| ----------- | ------ | ------------------------ |
| interfaceId | bytes4 | The interface identifier |

#### Return Values

| Name | Type | Description                                         |
| ---- | ---- | --------------------------------------------------- |
| [0]  | bool | True if the interface is supported, false otherwise |

### hook

```solidity
function hook() external pure returns (bytes)
```

Hook function for loan callback return. Aave

_AAVE requires uint256 == 1 while uniswap needs bytes memory layout. Other plugins require no return data.
This function standardizes the return data for CometFoundation to handle._

#### Return Values

| Name | Type  | Description                                              |
| ---- | ----- | -------------------------------------------------------- |
| [0]  | bytes | bytes memory Encoded return data for flash loan callback |
