# Solidity API

## CometCollateralSwap

\_This contract allows users to swap one type of collateral for another in their Compound V3 position
without needing to close their borrowing position. The process works by: 1. Taking a flash loan of the desired collateral asset 2. Supplying the flash loan to the user's Compound position 3. Withdrawing the user's existing collateral 4. Swapping the withdrawn collateral for the borrowed asset to repay the flash loan 5. Supplying any remaining dust back to the user's position

     The contract supports multiple flash loan providers through a modular plugin system and
     uses configurable swap plugins for executing the collateral swap.

Features: - Multi-protocol flash loan support - Modular swap execution through dedicated swap plugins - Health factor validation to ensure position remains safe after swap - Gas-optimized execution using delegate calls and transient storage - Signature-based approvals for gasless transactions - Comprehensive slippage protection and validation
Security Features: - Callback validation ensures only registered plugins can execute operations - Health factor checks prevent unsafe position modifications - Exact balance validation before and after operations - Transient storage prevents storage slot collisions - Comprehensive input validation and error handling
Architecture: - Uses fallback() function as a universal callback handler for flash loan providers - Employs plugin pattern for extensibility and protocol abstraction - Integrates with allowBySig for meta-transaction support - Optimized for gas efficiency through minimal storage usage
@custom:security-considerations - Users must have sufficient collateral to maintain healthy positions after swaps - Flash loan fees are automatically accounted for in minimum output calculations - Slippage protection is enforced through minAmountOut parameter validation - Only registered and validated plugins can execute flash loans and swaps - Plugins are configured exclusively during contract deployment. To add or modify plugins,
redeployment of the contract is required.\_

### constructor

```solidity
constructor(struct ICometFoundation.Plugin[] _plugins) public payable
```

### fallback

```solidity
fallback() external
```

Handles flash loan callbacks from registered plugins to execute collateral swaps

\_This fallback function is the core of the collateral swap mechanism. It receives callbacks
from flash loan providers through registered plugins and executes a complete collateral swap: 1. Validates the callback is from an authorized source 2. Decodes the callback data and retrieves swap parameters 3. Supplies the borrowed asset to Comet on behalf of the user 4. Withdraws the user's collateral to be swapped 5. Swaps the withdrawn collateral for the borrowed asset to repay the loan 6. Supplies any remaining dust amounts back to the user 7. Repays the flash loan with fees

The function uses delegate calls to plugin endpoints for modularity and gas efficiency.
Temporary storage (tstore/tload) is used to pass swap parameters between function calls.\_

### executeSwap

```solidity
function executeSwap(struct ICometCollateralSwap.SwapParams swapParams) external
```

Executes a collateral swap using flash loans

_The main entry point for swapping collateral assets in a Compound V3 position.
This function: 1. Validates swap parameters and health factor impact 2. Initiates a flash loan for the target asset amount 3. Supplies the borrowed asset to increase collateral 4. Withdraws the original collateral to be swapped 5. Swaps the withdrawn asset for the borrowed asset 6. Repays the flash loan plus any fees 7. Supplies any remaining dust back to the user's position_

#### Parameters

| Name       | Type                                   | Description                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| swapParams | struct ICometCollateralSwap.SwapParams | The complete parameter struct defining the swap operation Requirements: - Caller must have sufficient collateral balance of fromAsset - Caller must have granted allowance to this contract on the Comet - The swap must not violate health factor constraints - The callbackSelector must correspond to a registered plugin - The swap must produce enough toAsset to repay the flash loan plus fees |

### executeSwapBySig

```solidity
function executeSwapBySig(struct ICometCollateralSwap.SwapParams swapParams, struct IAllowBySig.AllowParams allowParams) external
```

Executes a collateral swap with signature-based authorization in a single transaction

\_Combines Comet authorization via EIP-712 signature with collateral swap execution.
This allows users to authorize the contract and execute a swap atomically,
eliminating the need for a separate approve transaction.

     The function first validates and applies the signature-based authorization,
     then proceeds with the same swap logic as the regular swap function._

#### Parameters

| Name        | Type                                   | Description                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| swapParams  | struct ICometCollateralSwap.SwapParams | The complete parameter struct defining the swap operation                                                                                                                                                                                                                                                                                                   |
| allowParams | struct IAllowBySig.AllowParams         | The EIP-712 signature parameters for Comet authorization Requirements: - All requirements from swap() function - allowParams.owner must equal msg.sender - allowParams.manager must equal this contract address - allowParams.isAllowed must be true - The signature must be valid and not expired - The nonce must match the user's current nonce in Comet |

### \_executeSwap

```solidity
function _executeSwap(struct ICometCollateralSwap.SwapParams swapParams) internal
```

### \_checkCollateralization

```solidity
function _checkCollateralization(contract IComet comet, address assetFrom, address assetTo, uint256 fromAmount, uint256 minAmountOut, uint256 maxHealthFactorDropBps) internal view returns (bool)
```

_Checks if the collateralization is sufficient for the swap.
Liquidity is calculated based on comet implementation.
Implementation: https://github.com/compound-finance/comet/blob/main/contracts/Comet.sol#L544-L553_

#### Parameters

| Name                   | Type            | Description                                                  |
| ---------------------- | --------------- | ------------------------------------------------------------ |
| comet                  | contract IComet | The Comet contract instance.                                 |
| assetFrom              | address         | The address of the asset being swapped from.                 |
| assetTo                | address         | The address of the asset being swapped to.                   |
| fromAmount             | uint256         | The amount of the asset being swapped from.                  |
| minAmountOut           | uint256         | The minimum amount of the asset being swapped to.            |
| maxHealthFactorDropBps | uint256         | The maximum allowed drop in health factor (in basis points). |

### \_tstore

```solidity
function _tstore(address loanPlugin, address swapPlugin, address comet, address collateral, uint256 amount) internal
```

Stores operation parameters in transient storage for callback access

_Uses EIP-1153 transient storage for gas-efficient temporary data storage_

#### Parameters

| Name       | Type    | Description                       |
| ---------- | ------- | --------------------------------- |
| loanPlugin | address | Address of the flash loan plugin  |
| swapPlugin | address | Address of the swap plugin        |
| comet      | address | Address of the Comet comet        |
| collateral | address | Address of the collateral token   |
| amount     | uint256 | Collateral amount being processed |

### \_tload

```solidity
function _tload() internal returns (address loanPlugin, address swapPlugin, contract IComet comet, address fromAsset, uint256 fromAmount)
```

_Loads and clears swap parameters from transient storage_

#### Return Values

| Name       | Type            | Description                   |
| ---------- | --------------- | ----------------------------- |
| loanPlugin | address         | The flash loan plugin address |
| swapPlugin | address         | The swap plugin address       |
| comet      | contract IComet | The Comet contract address    |
| fromAsset  | address         | The asset being swapped from  |
| fromAmount | uint256         | The amount being swapped      |

### \_validateExecParams

```solidity
function _validateExecParams(struct ICometCollateralSwap.SwapParams swapParams) internal pure
```

_Validates swap parameters for correctness and safety_

#### Parameters

| Name       | Type                                   | Description                     |
| ---------- | -------------------------------------- | ------------------------------- |
| swapParams | struct ICometCollateralSwap.SwapParams | The swap parameters to validate |

### \_supplyDust

```solidity
function _supplyDust(address user, contract IERC20 asset, contract IComet comet, uint256 repayAmount) internal
```

_Supplies any remaining asset balance back to user's Comet position_

#### Parameters

| Name        | Type            | Description                                        |
| ----------- | --------------- | -------------------------------------------------- |
| user        | address         | The user to supply dust to                         |
| asset       | contract IERC20 | The asset to supply                                |
| comet       | contract IComet | The Comet contract address                         |
| repayAmount | uint256         | Amount reserved for repayment (excluded from dust) |
