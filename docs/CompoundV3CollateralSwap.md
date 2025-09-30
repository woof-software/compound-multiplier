# Solidity API

## CompoundV3CollateralSwap

### FACTOR_SCALE

```solidity
uint64 FACTOR_SCALE
```

_The scale for factors_

### BPS_DROP_DENOMINATOR

```solidity
uint16 BPS_DROP_DENOMINATOR
```

_The denominator for basis points (BPS), value declares 100%_

### SLOT_ADAPTER

```solidity
bytes32 SLOT_ADAPTER
```

_Storage slot for temporary adapter data_

### swapRouter

```solidity
address swapRouter
```

Returns the address of the swap router contract

_The router handles the actual token swapping logic (e.g., 1inch aggregator)_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### swapPlugin

```solidity
address swapPlugin
```

Returns the address of the swap plugin contract

_The plugin encapsulates swap logic and integrates with the chosen DEX aggregator_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### plugins

```solidity
mapping(bytes4 => struct ICompoundV3CollateralSwap.Plugin) plugins
```

Maps plugins callback selector to the plugin endpoint address

### constructor

```solidity
constructor(struct ICompoundV3CollateralSwap.Plugin[] plugins_, address swapRouter_, address swapPlugin_) public
```

Constructor

_Emits PluginRegistered event for each registered plugin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugins_ | struct ICompoundV3CollateralSwap.Plugin[] | Array of plugin structs |
| swapRouter_ | address | Address of the swap router |
| swapPlugin_ | address | Address of the swap plugin |

### fallback

```solidity
fallback() external
```

Handles flash loan callbacks from registered plugins to execute collateral swaps

_This fallback function is the core of the collateral swap mechanism. It receives callbacks
     from flash loan providers through registered plugins and executes a complete collateral swap:
     1. Validates the callback is from an authorized source
     2. Decodes the callback data and retrieves swap parameters
     3. Supplies the borrowed asset to Comet on behalf of the user
     4. Withdraws the user's collateral to be swapped
     5. Swaps the withdrawn collateral for the borrowed asset to repay the loan
     6. Supplies any remaining dust amounts back to the user
     7. Repays the flash loan with fees

The function uses delegate calls to plugin endpoints for modularity and gas efficiency.
Temporary storage (tstore/tload) is used to pass swap parameters between function calls._

### swap

```solidity
function swap(struct ICompoundV3CollateralSwap.SwapParams swapParams) external
```

Executes a collateral swap using flash loans

_The main entry point for swapping collateral assets in a Compound V3 position.
     This function:
     1. Validates swap parameters and health factor impact
     2. Initiates a flash loan for the target asset amount
     3. Supplies the borrowed asset to increase collateral
     4. Withdraws the original collateral to be swapped
     5. Swaps the withdrawn asset for the borrowed asset
     6. Repays the flash loan plus any fees
     7. Supplies any remaining dust back to the user's position_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapParams | struct ICompoundV3CollateralSwap.SwapParams | The complete parameter struct defining the swap operation Requirements: - Caller must have sufficient collateral balance of fromAsset - Caller must have granted allowance to this contract on the Comet - The swap must not violate health factor constraints - The callbackSelector must correspond to a registered plugin - The swap must produce enough toAsset to repay the flash loan plus fees |

### swapWithApprove

```solidity
function swapWithApprove(struct ICompoundV3CollateralSwap.SwapParams swapParams, struct IAllowBySig.AllowParams allowParams) external
```

Executes a collateral swap with signature-based authorization in a single transaction

_Combines Comet authorization via EIP-712 signature with collateral swap execution.
     This allows users to authorize the contract and execute a swap atomically,
     eliminating the need for a separate approve transaction.

     The function first validates and applies the signature-based authorization,
     then proceeds with the same swap logic as the regular swap function._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapParams | struct ICompoundV3CollateralSwap.SwapParams | The complete parameter struct defining the swap operation |
| allowParams | struct IAllowBySig.AllowParams | The EIP-712 signature parameters for Comet authorization Requirements: - All requirements from swap() function - allowParams.owner must equal msg.sender - allowParams.manager must equal this contract address - allowParams.isAllowed must be true - The signature must be valid and not expired - The nonce must match the user's current nonce in Comet |

### _swap

```solidity
function _swap(struct ICompoundV3CollateralSwap.SwapParams swapParams) internal
```

### _checkCollateralization

```solidity
function _checkCollateralization(contract IComet comet, address assetFrom, address assetTo, uint256 fromAmount, uint256 minAmountOut, uint256 maxHealthFactorDropBps) internal view returns (bool)
```

_Checks if the collateralization is sufficient for the swap._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | contract IComet | The Comet contract instance. |
| assetFrom | address | The address of the asset being swapped from. |
| assetTo | address | The address of the asset being swapped to. |
| fromAmount | uint256 | The amount of the asset being swapped from. |
| minAmountOut | uint256 | The minimum amount of the asset being swapped to. |
| maxHealthFactorDropBps | uint256 | The maximum allowed drop in health factor (in basis points). |

### _tstore

```solidity
function _tstore(address comet, address fromAsset, uint256 fromAmount) internal
```

_Stores swap parameters in transient storage for use in fallback callback_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | address | The Comet contract address |
| fromAsset | address | The asset being swapped from |
| fromAmount | uint256 | The amount being swapped |

### _tload

```solidity
function _tload() internal returns (address comet, address fromAsset, uint256 fromAmount)
```

_Loads and clears swap parameters from transient storage_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| comet | address | The Comet contract address |
| fromAsset | address | The asset being swapped from |
| fromAmount | uint256 | The amount being swapped |

### _validateSwapParams

```solidity
function _validateSwapParams(struct ICompoundV3CollateralSwap.SwapParams swapParams) internal pure
```

_Validates swap parameters for correctness and safety_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapParams | struct ICompoundV3CollateralSwap.SwapParams | The swap parameters to validate |

### _supplyDust

```solidity
function _supplyDust(address user, address asset, address comet, uint256 repayAmount) internal
```

_Supplies any remaining asset balance back to user's Comet position_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The user to supply dust to |
| asset | address | The asset to supply |
| comet | address | The Comet contract address |
| repayAmount | uint256 | Amount reserved for repayment (excluded from dust) |

### _catch

```solidity
function _catch(bool success) internal pure
```

_Reverts with the original error if a call failed_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Whether the call succeeded |

