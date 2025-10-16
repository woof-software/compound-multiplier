# Solidity API

## ICometMultiplier

### executeMultiplier

```solidity
function executeMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData) external payable
```

Creates a leveraged position by borrowing against supplied collateral

\_This function:

1. Validates the flash loan plugin exists
2. Calculates the required loan amount based on leverage
3. Transfers user's collateral to the contract
4. Initiates a flash loan to execute the leveraged position\_

#### Parameters

| Name             | Type                            | Description                                                                |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                 | Address of the collateral token to supply                                  |
| collateralAmount | uint256                         | Amount of collateral tokens to supply                                      |
| leverage         | uint256                         | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                           | Encoded swap parameters for the DEX aggregator                             |

### executeMultiplierBySig

```solidity
function executeMultiplierBySig(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, struct ICometFoundation.AllowParams allowParams) external payable
```

Creates a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then executes the position_

#### Parameters

| Name             | Type                                | Description                                                                |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                     | Address of the collateral token to supply                                  |
| collateralAmount | uint256                             | Amount of collateral tokens to supply                                      |
| leverage         | uint256                             | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                               | Encoded swap parameters for the DEX aggregator                             |
| allowParams      | struct ICometFoundation.AllowParams | EIP-712 signature parameters for Comet authorization                       |

### withdrawMultiplier

```solidity
function withdrawMultiplier(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData) external
```

Reduces or closes a leveraged position by withdrawing collateral and repaying debt

\_This function:

1. Checks that the user has an outstanding borrow balance
2. Calculates the maximum withdrawable amount based on collateralization
3. Initiates a flash loan to temporarily repay debt and withdraw collateral\_

#### Parameters

| Name             | Type                            | Description                                                                |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                 | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                         | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                           | Encoded swap parameters for converting collateral to base asset            |

### withdrawMultiplierBySig

```solidity
function withdrawMultiplierBySig(struct ICometFoundation.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData, struct ICometFoundation.AllowParams allowParams) external
```

Reduces or closes a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then withdraws the position_

#### Parameters

| Name             | Type                                | Description                                                                |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometFoundation.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                     | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                             | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                               | Encoded swap parameters for converting collateral to base asset            |
| allowParams      | struct ICometFoundation.AllowParams | EIP-712 signature parameters for Comet authorization                       |

### wEth

```solidity
function wEth() external view returns (address)
```

Returns the address of the WETH token used for wrapping/unwrapping ETH
