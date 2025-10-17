# Solidity API

## UniswapV3Plugin

Flash loan plugin for integrating Uniswap V3 pools with CometMultiplier

_Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality_

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback function selector for Uniswap V3 flash loans

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

Storage slot for transient flash loan ID validation

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometStructs.CallbackData data, bytes config) external payable
```

Initiates a flash loan

_config encodes UniswapV3Config with token->pool pools_

#### Parameters

| Name   | Type                              | Description                                                              |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| data   | struct ICometStructs.CallbackData | Flash loan parameters including debt amount, asset, and user information |
| config | bytes                             |                                                                          |

### \_findPool

```solidity
function _findPool(struct ICometStructs.Pool[] pools, address asset) internal pure returns (address pool)
```

Finds pool address for given asset

#### Parameters

| Name  | Type                        | Description                    |
| ----- | --------------------------- | ------------------------------ |
| pools | struct ICometStructs.Pool[] | Array of token-to-pool pools   |
| asset | address                     | Asset address to find pool for |

#### Return Values

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| pool | address | Pool address, or address(0) if not found |

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

Repays the flash loan

#### Parameters

| Name      | Type    | Description                              |
| --------- | ------- | ---------------------------------------- |
| flp       | address | Address of the flash loan provider       |
| baseAsset | address | Address of the borrowed asset            |
| amount    | uint256 | Total repayment amount (principal + fee) |

### uniswapV3FlashCallback

```solidity
function uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes data) external returns (struct ICometStructs.CallbackData _data)
```

Handles flash loan callback from Uniswap V3 pool

_Validates flash loan ID and sender authorization before processing_

#### Parameters

| Name | Type    | Description                                      |
| ---- | ------- | ------------------------------------------------ |
| fee0 | uint256 | Fee amount for token0                            |
| fee1 | uint256 | Fee amount for token1                            |
| data | bytes   | Encoded callback data from flash loan initiation |

#### Return Values

| Name   | Type                              | Description                                  |
| ------ | --------------------------------- | -------------------------------------------- |
| \_data | struct ICometStructs.CallbackData | Decoded callback data for adapter processing |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

\_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas.\_
