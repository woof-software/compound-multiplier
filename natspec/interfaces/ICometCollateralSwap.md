# Solidity API

## ICometCollateralSwap

Interface for CompoundV3 collateral swap contract

_This contract enables users to swap one collateral asset for another within their Compound V3 position
using flash loans. The swap maintains the user's debt position while changing their collateral composition._

### executeSwap

```solidity
function executeSwap(struct ICometFoundation.SwapParams swapParams) external
```

Executes a collateral swap using flash loans

_The main entry point for swapping collateral assets in a Compound V3 position.
This function: 1. Validates swap parameters and health factor impact 2. Initiates a flash loan for the target asset amount 3. Supplies the borrowed asset to increase collateral 4. Withdraws the original collateral to be swapped 5. Swaps the withdrawn asset for the borrowed asset 6. Repays the flash loan plus any fees 7. Supplies any remaining dust back to the user's position_

#### Parameters

| Name       | Type                               | Description                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| swapParams | struct ICometFoundation.SwapParams | The complete parameter struct defining the swap operation Requirements: - Caller must have sufficient collateral balance of fromAsset - Caller must have granted allowance to this contract on the Comet - The swap must not violate health factor constraints - The callbackSelector must correspond to a registered plugin - The swap must produce enough toAsset to repay the flash loan plus fees |

### executeSwapBySig

```solidity
function executeSwapBySig(struct ICometFoundation.SwapParams swapParams, struct ICometFoundation.AllowParams allowParams) external
```

Executes a collateral swap with signature-based authorization in a single transaction

\_Combines Comet authorization via EIP-712 signature with collateral swap execution.
This allows users to authorize the contract and execute a swap atomically,
eliminating the need for a separate approve transaction.

     The function first validates and applies the signature-based authorization,
     then proceeds with the same swap logic as the regular swap function._

#### Parameters

| Name        | Type                                | Description                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| swapParams  | struct ICometFoundation.SwapParams  | The complete parameter struct defining the swap operation                                                                                                                                                                                                                                                                                                   |
| allowParams | struct ICometFoundation.AllowParams | The EIP-712 signature parameters for Comet authorization Requirements: - All requirements from swap() function - allowParams.owner must equal msg.sender - allowParams.manager must equal this contract address - allowParams.isAllowed must be true - The signature must be valid and not expired - The nonce must match the user's current nonce in Comet |
