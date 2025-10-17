# Solidity API

## IPool

### flashLoanSimple

```solidity
function flashLoanSimple(address receiverAddress, contract IERC20 asset, uint256 amount, bytes params, uint16 referralCode) external
```

Allows smartcontracts to access the liquidity of the pool within one transaction,
as long as the amount taken plus a fee is returned.

_IMPORTANT There are security concerns for developers of flashloan receiver contracts that must be kept
into consideration. For further details please visit https://docs.aave.com/developers/_

#### Parameters

| Name            | Type            | Description                                                                                                                                                         |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| receiverAddress | address         | The address of the contract receiving the funds, implementing IFlashLoanSimpleReceiver interface                                                                    |
| asset           | contract IERC20 | The address of the asset being flash-borrowed                                                                                                                       |
| amount          | uint256         | The amount of the asset being flash-borrowed                                                                                                                        |
| params          | bytes           | Variadic packed params to pass to the receiver as extra information                                                                                                 |
| referralCode    | uint16          | The code used to register the integrator originating the operation, for potential rewards. 0 if the action is executed directly by the user, without any middle-man |
