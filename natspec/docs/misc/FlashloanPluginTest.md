# Solidity API

## FlashloanPluginTest

### flp

```solidity
address flp
```

### endpoint

```solidity
contract ICometFlashLoanPlugin endpoint
```

### lastCallbackData

```solidity
struct ICometFlashLoanPlugin.CallbackData lastCallbackData
```

### amm

```solidity
uint256 amm
```

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

### constructor

```solidity
constructor(address _flp, address _endpoint) public
```

### flash

```solidity
function flash(struct ICometFlashLoanPlugin.CallbackData data) external
```

### attackAAVE

```solidity
function attackAAVE(struct ICometFlashLoanPlugin.CallbackData data, address asset, uint256 amount, uint256 premium, address initiator, bool toFailFlid) external
```

### attackBalancer

```solidity
function attackBalancer(struct ICometFlashLoanPlugin.CallbackData data, contract IERC20[] tokens, uint256[] amounts, uint256[] feeAmounts, bool toFailFlid) external
```

### attackCallback

```solidity
function attackCallback() public pure returns (struct ICometFlashLoanPlugin.CallbackData)
```

### fallback

```solidity
fallback() external payable
```

### \_catch

```solidity
function _catch(bool success) internal pure
```

### receive

```solidity
receive() external payable
```
