# Solidity API

## EulerV2Plugin

Flash loan plugin for integrating Euler V2 vaults with CometMultiplierAdapter

_Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality_

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback function selector for Euler V2 flash loans

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

Storage slot for transient flash loan ID validation

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) external payable
```

Initiates a flash loan

_Stores flash loan ID in transient storage for callback validation_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | struct ICometFlashLoanPlugin.CallbackData | Flash loan parameters including debt amount, asset, and user information |
|  | bytes |  |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

Repays the flash loan

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| flp | address | Address of the flash loan provider |
| baseAsset | address | Address of the borrowed asset |
| amount | uint256 | Total repayment amount (principal + fee) |

### onFlashLoan

```solidity
function onFlashLoan(bytes data) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

Handles flash loan callback from Euler V2 vault

_Validates flash loan ID and sender authorization before processing_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | bytes | Encoded callback data from flash loan initiation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | struct ICometFlashLoanPlugin.CallbackData | Decoded callback data for adapter processing |

