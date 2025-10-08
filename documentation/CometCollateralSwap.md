# CometCollateralSwap Documentation

## Overview

The `CometCollateralSwap` contract allows users to swap one collateral asset for another within their Compound V3 position using flash loans. The contract maintains the user's debt position while changing their collateral composition, allowing for portfolio rebalancing and risk management without requiring additional capital or closing positions.

## Key Features

- **Atomic Collateral Swaps**: Swap collateral assets in a single transaction
- **Flash Loan Integration**: Uses multiple flash loan providers (AAVE, Balancer, etc.)
- **Health Factor Protection**: Ensures swaps maintain account safety
- **Signature-Based Authorization**: Support for gasless approvals via EIP-712
- **Plugin Architecture**: Modular design for extensibility
- **Dust Management**: Automatically supplies remaining tokens back to user positions

## Architecture

### Core Components

1. **CometCollateralSwap**: Main contract handling swap orchestration
2. **Flash Loan Plugins**: Modular plugins for different flash loan providers
3. **Swap Plugins**: Handle asset swapping through DEX aggregators
4. **AllowBySig**: EIP-712 signature-based authorization system

## How It Works

### Swap Process

1. **Initialization**: User calls `swap()` or `swapWithApprove()` with parameters
2. **Validation**: Contract validates swap parameters and health factor impact
3. **Flash Loan**: Initiates flash loan for target asset amount via selected plugin
4. **Collateral Supply**: Supplies borrowed asset to user's Compound V3 position
5. **Collateral Withdrawal**: Withdraws original collateral to be swapped
6. **Asset Swap**: Swaps withdrawn collateral for borrowed asset via DEX aggregator
7. **Loan Repayment**: Repays flash loan plus fees
8. **Dust Supply**: Returns any remaining tokens to user's position

### Security Mechanisms

- **Health Factor Validation**: Ensures swaps don't endanger account safety
- **Plugin Authorization**: Only registered plugins can execute callbacks
- **Balance Verification**: Validates exact token amounts throughout execution
- **Signature Validation**: EIP-712 signatures prevent replay attacks

## Contract Interface

### Main Functions

#### `swap(SwapParams calldata swapParams)`

Executes a collateral swap using flash loans.

**Parameters:**

- `swapParams.comet`: Compound V3 Comet contract address
- `swapParams.flp` : Flash Loan Provider address
- `swapParams.callbackSelector`: Flash loan plugin selector to use
- `swapParams.fromAsset`: Asset to swap from (must be valid collateral)
- `swapParams.fromAmount`: Amount to swap
- `swapParams.toAsset`: Asset to swap to (must be valid collateral)
- `swapParams.swapCalldata`: Encoded swap router calldata
- `swapParams.minAmountOut`: Minimum expected output (slippage protection)
- `swapParams.maxHealthFactorDropBps`: Maximum allowed health factor drop (basis points)

#### `swapWithApprove(SwapParams calldata swapParams, AllowParams calldata allowParams)`

Combines signature-based authorization with collateral swap in one transaction.

**Additional Parameters:**

- `allowParams.owner`: The account owner (must be msg.sender)
- `allowParams.manager`: The authorized manager (must be this contract)
- `allowParams.isAllowed`: Authorization status (must be true)
- `allowParams.nonce`: Current nonce from Comet
- `allowParams.expiry`: Signature expiration timestamp
- `allowParams.v`, `allowParams.r`, `allowParams.s`: Signature components

### Constants

- `FACTOR_SCALE`: 1e18 - Scale factor for calculations
- `BPS_DROP_DENOMINATOR`: 10,000 - Basis points denominator (100%)

## Deployment Guide

### Prerequisites

1. **Node.js**: Version >=22.10.0 <23.0.0 || >=23.11.0
2. **pnpm**: Version >=10.9.0
3. **Foundry**: For Solidity compilation
4. **Environment Variables**: Set up `.env` file with required keys

### Step-by-Step Deployment

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Compile Contracts

```bash
pnpm compileh
```

#### 3. Deploy Flash Loan Plugins

Flash loan plugins must be deployed first as they are dependencies for the main contract.

##### Deploy AAVE Plugin

```bash
npx hardhat run scripts/deploy/plugins/aave.ts --network <network>
```

This deploys:

- **Contract**: AAVEPlugin
- **Flash Loan Provider**: AAVE V3 Pool (0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2)
- **Saves to**: `deployments/<network>.json` under `FlashPlugins.aave`

##### Deploy Balancer Plugin

```bash
npx hardhat run scripts/deploy/plugins/balancer.ts --network <network>
```

This deploys:

- **Contract**: BalancerPlugin
- **Flash Loan Provider**: Balancer Vault (0xBA12222222228d8Ba445958a75a0704d566BF2C8)
- **Saves to**: `deployments/<network>.json` under `FlashPlugins.balancer`

#### 4. Deploy Swap Plugin (LiFi)

```bash
npx hardhat run scripts/deploy/plugins/LiFi.ts --network <network>
```

This deploys:

- **Contract**: LiFiPlugin
- **Router**: LiFi Diamond (0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE)
- **Saves to**: `deployments/<network>.json` under `LiFiPlugin`

#### 5. Deploy Main Contract

```bash
npx hardhat run scripts/deploy/CometCollateralSwap.ts --network <network>
```

This deployment script:

1. **Reads** deployment file for the network
2. **Filters** plugins (currently: AAVE and Balancer only)
3. **Extracts** LiFi plugin configuration
4. **Deploys** CometCollateralSwap with:
   - Filtered flash loan plugins array
   - LiFi router address
   - LiFi plugin endpoint address
5. **Verifies** the contract on Etherscan (if configured)
6. **Saves** deployment address to `deployments/<network>.json`

### Deployment File Structure

After successful deployment, `deployments/<network>.json` will contain:

```json
{
  "FlashPlugins": {
    "aave": {
      "endpoint": "0x...", // AAVEPlugin address
      "flp": "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
    },
    "balancer": {
      "endpoint": "0x...", // BalancerPlugin address
      "flp": "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
    }
  },
  "LiFiPlugin": {
    "endpoint": "0x...", // LiFiPlugin address
    "router": "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
  },
  "CometCollateralSwap": "0x..." // Main contract address
}
```

### Important Notes

1. **Plugin Dependencies**: Flash loan and swap plugins MUST be deployed before the main contract
2. **Network Configuration**: Ensure proper network configuration in `hardhat.config.ts`
3. **Verification**: Contracts are automatically verified on Etherscan if API key is configured

### Verification

Each deployment script automatically verifies contracts using:

```typescript
await verify(contractAddress, constructorArgs);
```

Manual verification can be performed via:

```bash
npx hardhat verify --network <network> <contract_address> <constructor_args>
```

## Usage Examples

### Basic Collateral Swap

```solidity
IComet(comet).allow(contract, true);

// Swap WETH to USDC collateral
CometCollateralSwap.SwapParams memory params = CometCollateralSwap.SwapParams({
    comet: cometAddress,
    flp: flpAddress,
    callbackSelector: aavePlugin.CALLBACK_SELECTOR(),
    fromAsset: wethAddress,
    fromAmount: 1 ether,
    toAsset: usdcAddress,
    swapCalldata: lifiSwapData,
    minAmountOut: 2500 * 1e6, // 2500 USDC minimum
    maxHealthFactorDropBps: 500 // 5% max health factor drop
});

contract.swap(params);
```

### Swap with Signature Authorization

Sign data from wallet and prepare struct with signature data (example could be find in tests)

```solidity
// Create EIP-712 signature for authorization
AllowBySig.AllowParams memory allowParams = AllowBySig.AllowParams({
    owner: msg.sender,
    manager: address(contract),
    isAllowed: true,
    nonce: comet.userNonce(msg.sender),
    expiry: block.timestamp + 3600, // 1 hour
    v: signature.v,
    r: signature.r,
    s: signature.s
});

contract.swapWithApprove(params, allowParams);
```

## Security Considerations

### Health Factor Protection

The contract validates that swaps won't drop the health factor below acceptable levels:

```solidity
function _checkCollateralization(...) returns (bool) {
    // Calculates impact on borrowing capacity
    // Ensures swap maintains account safety
}
```

### Plugin Authorization

Only registered plugins can execute callbacks, preventing unauthorized access:

```solidity
require(endpoint != address(0), UnknownCallbackSelector());
require(msg.sender == plugins[msg.sig].flp, UnauthorizedCallback());
```

### Balance Validation

Exact token balance requirements are enforced throughout execution:

```solidity
require(IERC20(asset).balanceOf(address(this)) == data.snapshot + debt, InvalidAmountOut());
```

## Error Handling

The contract includes comprehensive error handling:

- `UnauthorizedCallback`: Invalid flash loan provider
- `ZeroAddress`: Zero address in configuration
- `UnknownPlugin`: Unregistered plugin selector
- `NotSufficientLiquidity`: Insufficient collateralization
- `InvalidAmountOut`: Balance validation failure
- `InvalidSwapParameters`: Invalid input parameters

## Gas Optimization

- **Transient Storage**: Uses `tstore`/`tload` for temporary data
- **Delegate Calls**: Minimizes contract size through plugins
- **Batch Operations**: Atomic execution reduces transaction costs
- **Dust Management**: Efficient handling of remaining balances

## Testing

Run the test suite:

```bash
# Run all tests on hardhat
pnpm testh

# Run with verbose output
pnpm testh:vvv

# Run with gas reporting
pnpm testh:gas
```

> **Note**: all tests are running on mainnet forking. Make sure you set FORKING=true and added your RPC URL for FORKING_URL=
> For default all tests will be running in asynchronous mode, thus we recommend to run scenarious in individual mode through `.only` flag and setting `SERIAL=true` in `.env` file.

## Support

For technical support or questions:

- Review the test files in `/test` directory
- Check interface documentation in `/contracts/interfaces`
- Refer to plugin implementations in `/contracts/plugins`

---

**Note**: This documentation covers the current implementation. Always verify contract addresses and parameters for your specific deployment network.
