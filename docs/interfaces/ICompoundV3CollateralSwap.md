# Solidity API

## ICometCollateralSwap

Interface for CompoundV3 collateral swap contract

_This contract enables users to swap one collateral asset for another within their Compound V3 position
     using flash loans. The swap maintains the user's debt position while changing their collateral composition._

### Plugin

Configuration for flash loan plugin endpoints

_Each plugin provides flash loan functionality from different providers (Uniswap V3, AAVE, Morpho, etc.)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Plugin {
  address endpoint;
  address flp;
}
```

### SwapParams

Parameters required to execute a collateral swap

_Contains all necessary information for the swap including assets, amounts, slippage protection, and swap routing_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct SwapParams {
  address comet;
  bytes4 callbackSelector;
  address fromAsset;
  uint256 fromAmount;
  address toAsset;
  bytes swapCalldata;
  uint256 minAmountOut;
  uint256 maxHealthFactorDropBps;
}
```

### PluginRegistered

```solidity
event PluginRegistered(bytes4 callbackSelector, address pluginEndpoint, address flp)
```

Emitted when a new flash loan plugin is registered

_This event is fired during contract construction for each plugin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| callbackSelector | bytes4 | The unique bytes4 selector for this plugin's callback function |
| pluginEndpoint | address | The address of the plugin contract |
| flp | address | The address of the flash loan provider this plugin interfaces with |

### UnauthorizedCallback

```solidity
error UnauthorizedCallback()
```

Thrown when a flash loan callback is received from an unauthorized source

_Only the registered flash loan provider for a given callback selector may call back_

### ZeroAddress

```solidity
error ZeroAddress()
```

Thrown when a zero address is provided where a valid address is required

_Prevents configuration errors during contract deployment_

### UnknownPlugin

```solidity
error UnknownPlugin()
```

Thrown when trying to use a plugin that hasn't been registered

_Occurs when callbackSelector in SwapParams doesn't match any registered plugin_

### NotSufficientLiquidity

```solidity
error NotSufficientLiquidity()
```

Thrown when the swap would result in insufficient collateralization

_The health factor check fails, meaning the swap would make the position too risky_

### UnknownCallbackSelector

```solidity
error UnknownCallbackSelector()
```

Thrown when a fallback function receives an unknown callback selector

_The msg.sig doesn't correspond to any registered flash loan plugin callback_

### FlashLoanFailed

```solidity
error FlashLoanFailed()
```

Thrown when a flash loan operation fails

_General error for flash loan execution failures_

### InsufficientAmountOut

```solidity
error InsufficientAmountOut()
```

Thrown when the actual swap output is less than the minimum required

_Slippage protection - the swap didn't produce enough of the target asset_

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

Thrown when token balance validations fail during swap execution

_Contract's token balances don't match expected values after flash loan operations_

### ZeroLength

```solidity
error ZeroLength()
```

Thrown when an array parameter has zero length where content is required

_Prevents deployment with empty plugin arrays_

### InvalidSwapParameters

```solidity
error InvalidSwapParameters()
```

Thrown when SwapParams contain invalid values

_Covers cases like zero addresses, zero amounts, or invalid health factor parameters_

### swapRouter

```solidity
function swapRouter() external view returns (address)
```

Returns the address of the swap router contract

_The router handles the actual token swapping logic (e.g., 1inch aggregator)_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the swap router |

### swapPlugin

```solidity
function swapPlugin() external view returns (address)
```

Returns the address of the swap plugin contract

_The plugin encapsulates swap logic and integrates with the chosen DEX aggregator_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the swap plugin |

### swap

```solidity
function swap(struct ICometCollateralSwap.SwapParams swapParams) external
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
| swapParams | struct ICometCollateralSwap.SwapParams | The complete parameter struct defining the swap operation Requirements: - Caller must have sufficient collateral balance of fromAsset - Caller must have granted allowance to this contract on the Comet - The swap must not violate health factor constraints - The callbackSelector must correspond to a registered plugin - The swap must produce enough toAsset to repay the flash loan plus fees |

### swapWithPermit

```solidity
function swapWithPermit(struct ICometCollateralSwap.SwapParams swapParams, struct IAllowBySig.AllowParams allowParams) external
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
| swapParams | struct ICometCollateralSwap.SwapParams | The complete parameter struct defining the swap operation |
| allowParams | struct IAllowBySig.AllowParams | The EIP-712 signature parameters for Comet authorization Requirements: - All requirements from swap() function - allowParams.owner must equal msg.sender - allowParams.manager must equal this contract address - allowParams.isAllowed must be true - The signature must be valid and not expired - The nonce must match the user's current nonce in Comet |

