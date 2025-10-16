# Solidity API

## ICometAlerts

### UnknownPlugin

```solidity
error UnknownPlugin()
```

Emitted when a plugin is not recognized

### InvalidOpts

```solidity
error InvalidOpts()
```

Emitted if input options are invalid

### InvalidWeth

```solidity
error InvalidWeth()
```

Emitted if wEth address is invalid

### InvalidLeverage

```solidity
error InvalidLeverage()
```

//MULTIPLIER

    /**

@notice Emitted if leverage value is invalid

### InvalidMode

```solidity
error InvalidMode()
```

Emitted if mode on fallback is invalid

### NothingToDeleverage

```solidity
error NothingToDeleverage()
```

Emitted if there is nothing to deleverage

### InsufficientLiquidity

```solidity
error InsufficientLiquidity()
```

Emitted if insufficient liquidity for the swap

### InvalidSwapParameters

```solidity
error InvalidSwapParameters()
```

Emitted if swap parameters are invalid

### InvalidReceiver

```solidity
error InvalidReceiver()
```

Emitted if receiver address is invalid

### InvalidTokens

```solidity
error InvalidTokens()
```

Emitted if tokens address validation fails

### InvalidSelector

```solidity
error InvalidSelector()
```

Emitted if swap data includes invalid selector

### UnauthorizedCallback

```solidity
error UnauthorizedCallback()
```

Emitted if flash loan callback is unauthorized

### InvalidFlashLoanProvider

```solidity
error InvalidFlashLoanProvider()
```

Emitted if flash loan provider address is invalid

### InvalidFlashLoanData

```solidity
error InvalidFlashLoanData()
```

Emitted if flash loan data is invalid

### InvalidAmountOut

```solidity
error InvalidAmountOut()
```

Emitted if amount out is less than expected

### InvalidAmountIn

```solidity
error InvalidAmountIn()
```

Emitted if amount in is zero
