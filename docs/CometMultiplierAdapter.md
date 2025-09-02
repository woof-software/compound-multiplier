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

### assets

```solidity
mapping(address => struct ICometMultiplierAdapter.Asset) assets
```

### markets

```solidity
mapping(address => bool) markets
```

### plugins

```solidity
mapping(bytes4 => struct ICometMultiplierAdapter.Plugin) plugins
```

### leverages

```solidity
mapping(address => mapping(address => uint256)) leverages
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

### addPlugin

```solidity
function addPlugin(address plugin, bytes config) external
```

### addMarket

```solidity
function addMarket(address market, struct ICometMultiplierAdapter.Asset asset) external
```

### addCollateral

```solidity
function addCollateral(address market, address collateralAsset, struct ICometMultiplierAdapter.Asset asset, uint256 leverage) external
```

### executeMultiplier

```solidity
function executeMultiplier(address market, address collateralAsset, uint256 initialAmount, uint256 leverage, bytes swapData, uint256 minAmountOut) external
```

### withdrawMultiplier

```solidity
function withdrawMultiplier(address market, address collateralAsset, uint256 sellAmount, bytes swapData, uint256 minBaseOut) external
```

### pause

```solidity
function pause() external
```

### unpause

```solidity
function unpause() external
```

### _executeSwap

```solidity
function _executeSwap(address srcToken, address dstToken, uint256 amount, uint256 minAmountOut, bytes swapData) internal returns (uint256 amountOut)
```

### _leveraged

```solidity
function _leveraged(contract IComet comet, address collateralAsset, uint256 initialAmount, uint256 leverage) internal view returns (uint256)
```

### _takeFlashLoan

```solidity
function _takeFlashLoan(address endpoint, struct ICometFlashLoanPlugin.CallbackData data) internal
```

### _addAsset

```solidity
function _addAsset(address collateralAsset, struct ICometMultiplierAdapter.Asset asset) internal
```

### _tstore

```solidity
function _tstore(uint256 amount, address market, address collateral, uint256 minAmountOut, enum ICometMultiplierAdapter.Mode mode) internal
```

### _tload

```solidity
function _tload() internal returns (uint256 amount, address market, address collateral, uint256 minAmountOut, enum ICometMultiplierAdapter.Mode mode)
```

### _catch

```solidity
function _catch(bool success) internal pure
```

