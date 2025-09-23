# Solidity API

## WstEthPlugin

Swap plugin for converting between WETH and wstETH via Lido staking

_Implements ICometSwapPlugin interface to provide specialized WETH / wstETH conversion_

### CALLBACK_SELECTOR

```solidity
bytes4 CALLBACK_SELECTOR
```

Callback function selector for this swap plugin

_Used by CometMultiplierAdapter to identify and route swap calls to this plugin_

### receive

```solidity
receive() external payable
```

Allows the contract to receive ETH for staking operations

_Required for receiving ETH from WETH unwrapping and stETH withdrawals_

### executeSwap

```solidity
function executeSwap(address srcToken, address dstToken, uint256 amountIn, uint256 minAmountOut, bytes config, bytes swapData) external returns (uint256 amountOut)
```

### _lidoSwap

```solidity
function _lidoSwap(address wEth, address wstEth, address stEth, uint256 amountIn, uint256 minAmountOut) internal returns (uint256 amountOut)
```

