# Solidity API

## ICometExchange

Interface for CompoundV3 collateral swap contract

_This contract enables users to swap one collateral asset for another within their Compound V3 position
using flash loans. The swap maintains the user's debt position while changing their collateral composition._

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
