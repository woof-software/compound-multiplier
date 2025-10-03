# Swap Plugins

## Overview

Swap Plugins are modular, reusable contracts that provide a unified interface for executing token swaps across various decentralized exchange (DEX) protocols and aggregators. These plugins abstract the complexity of different swap implementations and provide a consistent way to interact with multiple liquidity sources for optimal trade execution.

## Purpose

The Swap Plugin system serves several key purposes:

1. **Protocol Abstraction**: Each plugin wraps the specific implementation details of different DEX protocols and aggregators (1inch V6, LiFi, etc.) behind a common interface
2. **Modularity**: Plugins can be used across different contracts without modifications, promoting code reuse and maintainability
3. **Extensibility**: New swap sources can be easily added by implementing the standard interface
4. **Best Execution**: Multiple swap sources provide options for finding the best rates and liquidity
5. **Gas Optimization**: Each plugin is optimized for its specific protocol while maintaining interface compatibility
6. **Cross-Chain Support**: Support for cross-chain swaps through specialized plugins like LiFi

## Unifying Interface

All swap plugins implement the `ICometSwapPlugin` interface, which provides a standardized way to interact with different swap protocols:

```solidity
interface ICometSwapPlugin {
  event SwapExecuted(
    address indexed router,
    address indexed srcToken,
    address indexed dstToken,
    uint256 actualAmountOut
  );

  error InvalidAmountOut();
  error InvalidInput();
  error ZeroAddress();
  error InvalidSwapParameters();
  error SwapFailed();

  function CALLBACK_SELECTOR() external view returns (bytes4);

  function executeSwap(
    address srcToken,
    address dstToken,
    uint256 amountIn,
    uint256 minAmountOut,
    bytes calldata config,
    bytes calldata swapData
  ) external returns (uint256 amountOut);
}
```

### Key Components

#### Function Parameters

- **srcToken**: The address of the input token to be swapped
- **dstToken**: The address of the output token to receive
- **amountIn**: The exact amount of input tokens to swap
- **minAmountOut**: The minimum amount of output tokens expected (slippage protection)
- **config**: Plugin-specific configuration data (e.g., router address)
- **swapData**: Encoded swap execution data specific to the protocol

#### Required Functions

1. **`executeSwap()`**: Executes the token swap using the specific protocol
2. **`CALLBACK_SELECTOR()`**: Returns the function selector for protocol identification

#### Events

- **`SwapExecuted`**: Emitted when a swap is successfully completed, providing transparency about the swap execution

## Validation Logic

Each swap plugin implements comprehensive validation logic to ensure security, proper execution, and protection against common attack vectors:

### Input Validation

- **Token Address Validation**: Ensures source and destination tokens are not zero addresses
- **Token Pair Validation**: Prevents swaps where source and destination tokens are the same
- **Amount Validation**: Verifies that input amounts and minimum output amounts are greater than zero
- **Configuration Validation**: Validates plugin-specific configuration parameters

### Execution Validation

- **Slippage Protection**: Ensures the actual output amount meets or exceeds the minimum expected amount
- **Router Authorization**: Approves the specific router/protocol to spend the input tokens
- **Call Success Verification**: Validates that the swap execution call was successful
- **Balance Verification**: Some plugins verify token balances before and after execution for additional security

### Example Validation Pattern

```solidity
function executeSwap(
  address srcToken,
  address dstToken,
  uint256 amountIn,
  uint256 minAmountOut,
  bytes calldata config,
  bytes calldata swapData
) external returns (uint256 amountOut) {
  // Input validation
  require(srcToken != address(0) && dstToken != address(0), ZeroAddress());
  require(srcToken != dstToken, InvalidSwapParameters());
  require(amountIn > 0 && minAmountOut > 0, InvalidSwapParameters());

  address router = abi.decode(config, (address));

  // Approve router to spend tokens
  IERC20(srcToken).approve(router, amountIn);

  // Execute swap with protocol-specific logic
  (bool success, bytes memory result) = router.call(swapData);
  require(success, SwapFailed());

  // Validate output amount
  amountOut = _extractAmountOut(result); // Plugin-specific extraction
  require(amountOut >= minAmountOut, InvalidAmountOut());

  emit SwapExecuted(router, srcToken, dstToken, amountOut);
}
```

## Available Plugins

The system currently supports the following swap protocols:

- **OneInchV6SwapPlugin**
- **LiFiPlugin**

## Modular Architecture

Swap Plugins are designed as standalone, modular contracts that can be reused across different projects without modification:

### Reusability Benefits

- **No Dependencies**: Plugins have minimal external dependencies beyond standard interfaces
- **Stateless Design**: No persistent state that would conflict between different usage contexts
- **Standard Interface**: Consistent API across all implementations regardless of underlying protocol
- **Protocol Isolation**: Each plugin is self-contained and protocol-specific

### Integration Pattern

```solidity
contract SwapIntegratedContract {
  address public immutable swapPlugin;

  constructor(address swapPlugin_) {
    require(swapPlugin_ != address(0), "Zero address");
    swapPlugin = swapPlugin_;
  }

  function performSwap(
    address srcToken,
    address dstToken,
    uint256 amountIn,
    uint256 minAmountOut,
    bytes calldata config,
    bytes calldata swapData
  ) external returns (uint256 amountOut) {
    // Transfer tokens to this contract
    IERC20(srcToken).transferFrom(msg.sender, address(this), amountIn);

    // Execute swap via plugin using delegatecall
    (bool success, bytes memory result) = swapPlugin.delegatecall(
      abi.encodeWithSelector(
        ICometSwapPlugin.executeSwap.selector,
        srcToken,
        dstToken,
        amountIn,
        minAmountOut,
        config,
        swapData
      )
    );

    require(success, "Swap failed");
    amountOut = abi.decode(result, (uint256));

    // Transfer output tokens to user
    IERC20(dstToken).transfer(msg.sender, amountOut);
  }
}
```

### Usage in Main Contracts

Swap plugins are integrated into main contracts like `CometCollateralSwap` and `CometMultiplierAdapter`:

1. **Plugin Configuration**: Main contracts store references to swap plugin addresses
2. **Delegatecall Execution**: Swaps are executed via delegatecall to maintain the main contract's context
3. **Token Flow Management**: Main contracts handle token transfers before and after swap execution
4. **Integration with Flash Loans**: Swap plugins work seamlessly with flash loan plugins for complex operations

## Security Considerations

- **Input Sanitization**: Comprehensive validation of all input parameters
- **Slippage Protection**: Built-in minimum output amount validation
- **Router Approval Management**: Precise token approval amounts to minimize exposure
- **Call Validation**: Proper handling of external call failures and return data
- **Reentrancy Protection**: Stateless design eliminates reentrancy concerns
- **Protocol Isolation**: Each plugin's validation logic is independent and protocol-specific

## Gas Optimization

- **Minimal Storage**: Stateless design avoids unnecessary storage operations
- **Efficient Approvals**: Optimized token approval patterns for each protocol
- **Protocol-Specific**: Each plugin is tailored to its protocol's gas characteristics
- **Delegatecall Usage**: Efficient execution context preservation in integrated contracts

## Error Handling

Plugins implement comprehensive error handling with custom errors for different failure scenarios:

- **`InvalidAmountOut`**: Output amount below minimum threshold
- **`InvalidInput`**: Invalid input parameters or token addresses
- **`ZeroAddress`**: Zero address provided where valid address required
- **`InvalidSwapParameters`**: General parameter validation failures
- **`SwapFailed`**: External swap call execution failures
