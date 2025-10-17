# Solidity API

## IOneInchV6

### SwapDescription

```solidity
struct SwapDescription {
  address srcToken;
  address dstToken;
  address srcReceiver;
  address dstReceiver;
  uint256 amount;
  uint256 minReturnAmount;
  uint256 flags;
}
```

### swap

```solidity
function swap(address executor, struct IOneInchV6.SwapDescription desc, bytes data) external payable returns (uint256 returnAmount, uint256 spentAmount)
```

Performs a swap

#### Parameters

| Name     | Type                              | Description                                                    |
| -------- | --------------------------------- | -------------------------------------------------------------- |
| executor | address                           | Aggregation executor that executes calls described in data     |
| desc     | struct IOneInchV6.SwapDescription | Swap description containing all swap parameters                |
| data     | bytes                             | Encoded calls that executor should execute in between of swaps |

#### Return Values

| Name         | Type    | Description                     |
| ------------ | ------- | ------------------------------- |
| returnAmount | uint256 | Resulting token amount received |
| spentAmount  | uint256 | Source token amount spent       |
