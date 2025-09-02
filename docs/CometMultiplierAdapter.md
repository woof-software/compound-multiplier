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

### router

```solidity
contract IAggregationRouterV6 router
```

### assets

```solidity
mapping(address => mapping(address => struct ICometMultiplierAdapter.Asset)) assets
```

### plugins

```solidity
mapping(bytes4 => struct ICometMultiplierAdapter.Plugin) plugins
```

### constructor

```solidity
constructor(contract IAggregationRouterV6 _router, struct ICometMultiplierAdapter.Plugin[] _plugins) public
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

### addAsset

```solidity
function addAsset(address market, address collateralAsset, address flp, bytes4 pluginSelector, uint256 leverage) external
```

### executeMultiplier

```solidity
function executeMultiplier(address market, address collateralAsset, uint256 initialAmount, uint256 leverageBps, bytes swapData, uint256 minAmountOut) external
```

### _executeSwap

```solidity
function _executeSwap(address srcToken, address dstToken, uint256 amount, uint256 minAmountOut, bytes swapData) internal returns (uint256 returnAmount)
```

### _catch

```solidity
function _catch(bool success) internal pure
```

