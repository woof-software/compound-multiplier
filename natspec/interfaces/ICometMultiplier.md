# Solidity API

## ICometMultiplier

### multiply

```solidity
function multiply(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData) external payable
```

Creates a leveraged position by borrowing against supplied collateral

\_This function:

1. Validates the flash loan plugin exists
2. Calculates the required loan amount based on leverage
3. Transfers user's collateral to the contract
4. Initiates a flash loan to execute the leveraged position\_

#### Parameters

| Name             | Type                         | Description                                                                |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20              | Address of the collateral token to supply                                  |
| collateralAmount | uint256                      | Amount of collateral tokens to supply                                      |
| leverage         | uint256                      | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                        | Encoded swap parameters for the DEX aggregator                             |

### multiply

```solidity
function multiply(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, struct ICometStructs.AllowParams allowParams) external payable
```

Creates a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then executes the position_

#### Parameters

| Name             | Type                             | Description                                                                |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                  | Address of the collateral token to supply                                  |
| collateralAmount | uint256                          | Amount of collateral tokens to supply                                      |
| leverage         | uint256                          | Leverage multiplier (e.g., 20000 = 2x leverage)                            |
| swapData         | bytes                            | Encoded swap parameters for the DEX aggregator                             |
| allowParams      | struct ICometStructs.AllowParams | EIP-712 signature parameters for Comet authorization                       |
