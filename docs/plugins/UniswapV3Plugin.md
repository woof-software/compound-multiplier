# Solidity API

## UniswapV3Plugin

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback selector: keccak256("uniswapV3FlashCallback(uint256,uint256,bytes)") = 0xe9cbafb0

### SLOT_PLUGIN

```solidity
bytes32 SLOT_PLUGIN
```

### takeFlashLoan

```solidity
function takeFlashLoan(struct ICometFlashLoanPlugin.CallbackData data, bytes) public
```

### repayFlashLoan

```solidity
function repayFlashLoan(address flp, address baseAsset, uint256 amount) external
```

### uniswapV3FlashCallback

```solidity
function uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes data) external returns (struct ICometFlashLoanPlugin.CallbackData _data)
```

