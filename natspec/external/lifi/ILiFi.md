# Solidity API

## ILiFi

### SwapData

```solidity
struct SwapData {
  address callTo;
  address approveTo;
  address sendingAssetId;
  address receivingAssetId;
  uint256 fromAmount;
  bytes callData;
  bool requiresDeposit;
}
```

### swapTokensMultipleV3ERC20ToERC20

```solidity
function swapTokensMultipleV3ERC20ToERC20(bytes32 _transactionId, string _integrator, string _referrer, address payable _receiver, uint256 _minAmountOut, struct ILiFi.SwapData[] _swapData) external
```
