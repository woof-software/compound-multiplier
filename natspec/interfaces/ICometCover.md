# Solidity API

## ICometCover

Interface for CompoundV3 collateral position cover contract

### cover

```solidity
function cover(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData) external
```

Reduces or closes a leveraged position by withdrawing collateral and repaying debt

\_This function:

1. Checks that the user has an outstanding borrow balance
2. Calculates the maximum withdrawable amount based on collateralization
3. Initiates a flash loan to temporarily repay debt and withdraw collateral\_

#### Parameters

| Name             | Type                         | Description                                                                |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20              | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                      | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                        | Encoded swap parameters for converting collateral to base asset            |

### cover

```solidity
function cover(struct ICometStructs.Options opts, contract IERC20 collateral, uint256 collateralAmount, bytes swapData, struct ICometStructs.AllowParams allowParams) external
```

Reduces or closes a leveraged position with EIP-712 signature authorization

_This function first authorizes the adapter via allowBySig, then withdraws the position_

#### Parameters

| Name             | Type                             | Description                                                                |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------- |
| opts             | struct ICometStructs.Options     | Configuration options including market, selectors, and flash loan provider |
| collateral       | contract IERC20                  | Address of the collateral token to withdraw                                |
| collateralAmount | uint256                          | Amount of collateral tokens to withdraw (or type(uint256).max for maximum) |
| swapData         | bytes                            | Encoded swap parameters for converting collateral to base asset            |
| allowParams      | struct ICometStructs.AllowParams | EIP-712 signature parameters for Comet authorization                       |
