# Solidity API

## CometMultiplierAdapter

### LEVERAGE_PRECISION

```solidity
uint256 LEVERAGE_PRECISION
```

### MAX_LEVERAGE

```solidity
uint256 MAX_LEVERAGE
```

### SLOT_ADAPTER

```solidity
bytes32 SLOT_ADAPTER
```

### plugins

```solidity
mapping(bytes4 => struct ICometMultiplierAdapter.Plugin) plugins
```

### constructor

```solidity
constructor(struct ICometMultiplierAdapter.Plugin[] _plugins) public
```

### fallback

```solidity
fallback() external payable
```

### receive

```solidity
receive() external payable
```

### executeMultiplier

```solidity
function executeMultiplier(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 collateralAmount, uint256 leverage, bytes swapData, uint256 minAmountOut) external
```

### withdrawMultiplier

```solidity
function withdrawMultiplier(struct ICometMultiplierAdapter.Options opts, address collateral, uint256 baseAmount, bytes swapData, uint256 minAmountOut) external
```

### _swap

```solidity
function _swap(address srcToken, address dstToken, uint256 amount, uint256 minAmountOut, bytes4 swapSelector, bytes swapData) internal returns (uint256 amountOut)
```

### _loan

```solidity
function _loan(address endpoint, struct ICometFlashLoanPlugin.CallbackData data, bytes config) internal
```

### _leveraged

```solidity
function _leveraged(contract IComet comet, address collateralAsset, uint256 initialAmount, uint256 leverage) internal view returns (uint256)
```

### _unlocked

```solidity
function _unlocked(contract IComet comet, address col, uint256 repayBase) internal view returns (uint128)
```

### _scale

```solidity
function _scale(address priceFeed, uint256 scale) internal view returns (uint256)
```

### _tstore

```solidity
function _tstore(uint256 amount, address market, address collateral, uint256 minAmountOut, bytes4 swapSelector, enum ICometMultiplierAdapter.Mode mode) internal
```

### _tload

```solidity
function _tload() internal returns (uint256 amount, address market, address collateral, uint256 minAmountOut, bytes4 swapSelector)
```

### _catch

```solidity
function _catch(bool success) internal pure
```

