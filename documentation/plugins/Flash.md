# Flash Loan Plugins

## Overview

Flash Loan Plugins are modular, reusable contracts that provide a unified interface for accessing flash loan functionality from various DeFi protocols. These plugins abstract the complexity of different flash loan implementations and provide a consistent way to interact with multiple liquidity sources.

## Purpose

The Flash Loan Plugin system serves several key purposes:

1. **Protocol Abstraction**: Each plugin wraps the specific implementation details of different DeFi protocols (AAVE, Balancer, Uniswap V3, Euler V2, Morpho, etc.) behind a common interface
2. **Modularity**: Plugins can be used across different contracts without modifications, promoting code reuse and maintainability
3. **Extensibility**: New flash loan sources can be easily added by implementing the standard interface
4. **Risk Distribution**: Multiple liquidity sources provide fallback options and reduce dependency on any single protocol
5. **Gas Optimization**: Each plugin is optimized for its specific protocol while maintaining interface compatibility

## Unifying Interface

All flash loan plugins implement the `ICometFlashLoanPlugin` interface, which provides a standardized way to interact with different flash loan protocols:

```solidity
interface ICometFlashLoanPlugin {
  error UnauthorizedCallback();
  error InvalidFlashLoanId();
  error InvalidFlashLoanData();

  struct CallbackData {
    uint256 debt; // Amount to borrow
    uint256 fee; // Flash loan fee (set by plugin during callback)
    uint256 snapshot; // State snapshot for validation
    address user; // User initiating the operation
    address flp; // Flash loan provider address
    address asset; // Asset to borrow
    bytes swapData; // Additional data for swaps/operations
  }

  /// @notice The selector of the callback function
  function CALLBACK_SELECTOR() external view returns (bytes4);

  /// @notice Storage slot to store the flash loan ID
  function SLOT_PLUGIN() external view returns (bytes32);

  function takeFlashLoan(
    CallbackData memory data,
    bytes memory config
  ) external;

  function repayFlashLoan(address flp, address asset, uint256 amount) external;
}
```

### Key Components

#### CallbackData Structure

- **debt**: The amount of the asset to borrow
- **fee**: The flash loan fee (populated by the plugin during callback)
- **snapshot**: A state snapshot used for validation
- **user**: The address initiating the flash loan operation
- **flp**: The flash loan provider's contract address
- **asset**: The ERC20 token address to borrow
- **swapData**: Additional encoded data for swap operations

#### Required Functions

1. **`takeFlashLoan()`**: Initiates a flash loan with the specific protocol
2. **`repayFlashLoan()`**: Handles the repayment mechanism for the protocol
3. **`CALLBACK_SELECTOR()`**: Returns the function selector for the protocol's callback
4. **`SLOT_PLUGIN()`**: Returns a unique storage slot for tracking flash loan state

## Validation Logic

Each flash loan plugin implements robust validation logic to ensure security and prevent unauthorized access:

### Flash Loan ID Validation

- Plugins generate a unique flash loan ID (`flid`) by hashing the callback data
- The ID is stored in transient storage using a plugin-specific slot
- During the callback, the plugin verifies the received data matches the expected ID
- After validation, the stored ID is cleared to prevent replay attacks

### Authorization Checks

- **Callback Authorization**: Ensures callbacks only come from the expected flash loan provider
- **Data Integrity**: Validates that the received loan parameters match the requested parameters
- **Initiator Verification**: Confirms the flash loan was initiated by the plugin itself

### Example Validation Pattern

```solidity
function takeFlashLoan(CallbackData memory data, bytes memory) external {
    bytes memory _data = abi.encode(data);
    bytes32 flid = keccak256(_data);
    bytes32 slot = SLOT_PLUGIN;

    assembly {
        tstore(slot, flid)  // Store flash loan ID in transient storage
    }

    // Initiate protocol-specific flash loan...
}

// In callback function:
function protocolCallback(...) external returns (CallbackData memory _data) {
    bytes32 flidExpected;
    bytes32 slot = SLOT_PLUGIN;
    assembly {
        flidExpected := tload(slot)  // Load expected flash loan ID
        tstore(slot, 0)              // Clear the slot
    }

    require(keccak256(params) == flidExpected, InvalidFlashLoanId());
    require(_data.flp == msg.sender, UnauthorizedCallback());
    // Additional validation...
}
```

## Available Plugins

The system currently supports the following flash loan providers:

- **AAVEPlugin**: Integrates with AAVE's `flashLoanSimple` functionality
- **BalancerPlugin**: Utilizes Balancer Vault's flash loan feature
- **UniswapV3Plugin**: Leverages Uniswap V3 pool flash functionality
- **EulerV2Plugin**: Connects to Euler V2's flash loan system
- **MorphoPlugin**: Integrates with Morpho protocol flash loans

## Modular Architecture

Flash Loan Plugins are designed as standalone, modular contracts that can be reused across different projects without modification:

### Reusability Benefits

- **No Dependencies**: Plugins have minimal external dependencies
- **Stateless Design**: No persistent state that would conflict between uses
- **Standard Interface**: Consistent API across all implementations
- **Protocol Isolation**: Each plugin is self-contained and protocol-specific

### Integration Pattern

```solidity
contract MyContract {
  struct Plugin {
    address endpoint; // Plugin contract address
    bytes4 selector; // Callback selector
    bytes config; // Plugin-specific configuration
  }

  Plugin[] public plugins;

  function addPlugin(address pluginAddress) external {
    bytes4 selector = ICometFlashLoanPlugin(pluginAddress).CALLBACK_SELECTOR();
    plugins.push(
      Plugin({ endpoint: pluginAddress, selector: selector, config: "" })
    );
  }
}
```

### Usage in Main Contracts

Flash loan plugins are integrated into main contracts like `CometCollateralSwap` and `CometMultiplierAdapter`:

1. **Plugin Registration**: Main contracts maintain arrays of available plugins
2. **Dynamic Selection**: Plugins can be selected at runtime based on availability and cost
3. **Callback Routing**: Main contracts route flash loan callbacks to the appropriate plugin based on the callback selector
4. **Execution Flow**: The main contract coordinates the flash loan lifecycle while plugins handle protocol-specific details

## Security Considerations

- **Transient Storage**: Uses EIP-1153 transient storage for secure flash loan ID tracking
- **Callback Validation**: Multiple layers of validation prevent unauthorized callback execution
- **Replay Protection**: Flash loan IDs are single-use and automatically cleared
- **Protocol Isolation**: Each plugin's validation logic is independent and protocol-specific
- **Immutable Logic**: Plugin contracts contain no upgradeability mechanisms for security

## Gas Optimization

- **Minimal Storage**: Uses transient storage to avoid permanent state changes
- **Efficient Encoding**: Optimized data structures and encoding methods
- **Protocol-Specific**: Each plugin is tailored to its protocol's gas characteristics
- **Batch Operations**: Support for batched operations where protocols allow

This modular plugin architecture provides a robust, secure, and extensible foundation for flash loan operations while maintaining the flexibility to integrate with new protocols as the DeFi ecosystem evolves.
