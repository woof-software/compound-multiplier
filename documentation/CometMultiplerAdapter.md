# Comet Multiplier Adapter Documentation

## Overview

The `CometMultiplier` contract enables users to create and manage leveraged positions on Compound V3 (Comet) markets using flash loans. The contract maintains leveraged collateral positions while using borrowed base assets, allowing for portfolio amplification and risk management without requiring additional capital upfront.

## Key Features

- **Leveraged Position Creation**: Open leveraged positions in a single atomic transaction
- **Flash Loan Integration**: Uses multiple flash loan providers (Morpho Blue, Euler V2, Uniswap V3)
- **DEX Aggregation**: Optimal swap execution through LiFi and 1inch
- **Position Management**: Increase or decrease leverage dynamically
- **Signature-Based Authorization**: Support for gasless approvals via EIP-712
- **Plugin Architecture**: Modular design for extensibility and upgradability
- **Native ETH Support**: Direct ETH deposits with automatic WETH wrapping
- **Gas Optimization**: Uses transient storage (EIP-1153) for efficient temporary data

## Architecture

### Core Components

1. **CometMultiplier**: Main contract handling leverage orchestration
2. **Loan Plugins**: Modular plugins for different flash loan providers
   - MorphoPlugin
   - EulerV2Plugin
   - UniswapV3Plugin
3. **Swap Plugins**: Handle asset swapping through DEX aggregators
   - LiFiPlugin
   - OneInchV6SwapPlugin
   - WstEthPlugin
4. **AllowBySig**: EIP-712 signature-based authorization system

## How It Works

### Leverage Creation Process

1. **Initialization**: User calls `executeMultiplier()` or `executeMultiplierBySig()` with parameters
2. **Collateral Deposit**: User's collateral is transferred to the contract
3. **Flash Loan**: Initiates flash loan for the leveraged amount via selected plugin
4. **Asset Swap**: Swaps borrowed base asset to collateral token via DEX aggregator
5. **Collateral Supply**: Supplies total collateral (original + swapped) to user's Comet position
6. **Debt Creation**: Withdraws borrowed base asset from user's position
7. **Loan Repayment**: Repays flash loan plus fees
8. **Position Established**: User now has leveraged collateral position

### Leverage Reduction Process

1. **Initialization**: User calls `withdrawMultiplier()` or `withdrawMultiplierBySig()`
2. **Flash Loan**: Borrows base asset to temporarily repay user's debt
3. **Debt Repayment**: Supplies base asset to user's position, reducing/eliminating debt
4. **Collateral Withdrawal**: Withdraws unlocked collateral from user's position
5. **Asset Swap**: Swaps collateral back to base asset
6. **Loan Repayment**: Repays flash loan from swap proceeds
7. **Remainder Transfer**: Returns any leftover tokens to user

### Security Mechanisms

- **Slippage Protection**: Validates minimum output amounts on all swaps
- **Plugin Authorization**: Only registered plugins can execute callbacks
- **Balance Verification**: Validates exact token amounts throughout execution
- **Signature Validation**: EIP-712 signatures prevent replay attacks
- **Reentrancy Guards**: OpenZeppelin ReentrancyGuard protection
- **Transient Storage**: Prevents state manipulation between operations

## Contract Interface

### Main Functions

#### `executeMultiplier(Options memory opts, address collateral, uint256 collateralAmount, uint256 leverage, bytes calldata swapData, uint256 minAmountOut)`

Creates a leveraged position using flash loans.

**Parameters:**

- `opts.market`: Compound V3 Comet contract address
- `opts.loanSelector`: Flash loan plugin callback selector
- `opts.swapSelector`: Swap plugin callback selector
- `opts.flp`: Flash loan provider address
- `collateral`: Collateral token address (use WETH for ETH)
- `collateralAmount`: Initial collateral amount (ignored if sending ETH)
- `leverage`: Leverage multiplier in basis points (e.g., 20000 = 2x, 30000 = 3x)
- `swapData`: Encoded swap router calldata
- `minAmountOut`: Minimum expected swap output (slippage protection)

**Example:**

```solidity
// Create 2x leveraged WETH position
CometMultiplier.Options memory opts = CometMultiplier.Options({
    market: cometUSDC,
    loanSelector: morphoPlugin.CALLBACK_SELECTOR(),
    swapSelector: lifiPlugin.CALLBACK_SELECTOR(),
    flp: morphoBlueAddress
});

adapter.executeMultiplier(
    opts,
    wethAddress,
    1 ether,        // 1 WETH initial
    20000,          // 2x leverage
    lifiSwapData,
    1.95 ether      // Expect ~1.95 WETH from swap
);
```

#### `executeMultiplierBySig(Options memory opts, address collateral, uint256 collateralAmount, uint256 leverage, bytes calldata swapData, uint256 minAmountOut, AllowParams calldata allowParams)`

Creates leveraged position with signature-based authorization in one transaction.

**Additional Parameters:**

- `allowParams.owner`: Account owner (must be msg.sender)
- `allowParams.manager`: Authorized manager (must be this contract)
- `allowParams.isAllowed`: Authorization status (must be true)
- `allowParams.nonce`: Current nonce from Comet
- `allowParams.expiry`: Signature expiration timestamp
- `allowParams.v`, `allowParams.r`, `allowParams.s`: Signature components

#### `withdrawMultiplier(Options memory opts, address collateral, uint256 collateralAmount, bytes calldata swapData, uint256 minAmountOut)`

Reduces or closes a leveraged position.

**Parameters:**

- Same as `executeMultiplier` except:
- `collateralAmount`: Amount of collateral to withdraw (use `type(uint256).max` for full withdrawal)

#### `withdrawMultiplierBySig(Options memory opts, address collateral, uint256 collateralAmount, bytes calldata swapData, uint256 minAmountOut, AllowParams calldata allowParams)`

Reduces leveraged position with signature-based authorization.

### Constants

- `LEVERAGE_PRECISION`: 10,000 - Represents 1x leverage (e.g., 20000 = 2x)

## Plugin System

### Loan Plugins

All loan plugins implement the `ICometFlashLoanPlugin` interface:

```solidity
interface ICometFlashLoanPlugin {
  struct CallbackData {
    uint256 debt;
    uint256 fee;
    uint256 snapshot;
    address user;
    address flp;
    address asset;
    bytes swapData;
  }

  function CALLBACK_SELECTOR() external view returns (bytes4);
  function takeFlashLoan(
    CallbackData memory data,
    bytes memory config
  ) external;
  function repayFlashLoan(address flp, address asset, uint256 amount) external;
}
```

#### MorphoPlugin

- **Provider**: Morpho Blue
- **Flash Loan Address**: 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
- **Fees**: Zero fees
- **Liquidity**: High liquidity for major assets
- **Standard**: ERC-3156 compliant

#### EulerV2Plugin

- **Provider**: Euler V2 Vaults
- **Flash Loan Address**: 0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9
- **Fees**: Vault-specific
- **Liquidity**: Per-vault flash loan support

#### UniswapV3Plugin

- **Provider**: Uniswap V3 Pools
- **Flash Loan Address**: Pool-specific (e.g., 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640)
- **Fees**: Pool fee tier (0.05%, 0.3%, 1%)
- **Liquidity**: Decentralized, permissionless

### Swap Plugins

All swap plugins implement the `ICometSwapPlugin` interface:

```solidity
interface ICometSwapPlugin {
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

#### LiFiPlugin

- **Router**: LiFi Diamond (0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE)
- **Features**: Cross-chain swaps, multi-DEX routing
- **Best For**: Complex routes, cross-chain operations

#### OneInchV6SwapPlugin

- **Router**: 1inch v6 Aggregator (0x111111125421cA6dc452d289314280a0f8842A65)
- **Features**: Best price discovery, gas optimization
- **Best For**: Single-chain swaps, optimal pricing

#### WstEthPlugin

- **Router**: Lido wstETH (0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0)
- **Features**: Direct stETH/wstETH conversion
- **Best For**: stETH <-> wstETH with no slippage

## Deployment Guide

### Prerequisites

1. **Node.js**: Version >=22.10.0 <23.0.0 || >=23.11.0
2. **pnpm**: Version >=10.9.0
3. **Foundry**: For Solidity compilation
4. **Environment Variables**: Configure `.env` file

### Step-by-Step Deployment

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Configure Deployment

Edit `scripts/deploy/deploy.config.ts`:

```typescript
export const deployConfig: Record<string, DeployConfig> = {
  mainnet: {
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    plugins: {
      loanPlugins: {
        morpho: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
        euler: "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9",
        uniswapV3: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
      },
      swapPlugins: {
        lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",
        oneInch: "0x111111125421cA6dc452d289314280a0f8842A65",
        wsteth: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      },
    },
  },
};
```

#### 3. Compile Contracts

```bash
pnpm compile
```

#### 4. Deploy Main Contract and Plugins

```bash
npx hardhat run scripts/deploy/deploy.main.ts --network mainnet
```

This script:

1. Reads plugin configurations from deployment files
2. Assembles plugin array with endpoints and configurations
3. Deploys CometMultiplier
4. Verifies the contract on Etherscan
5. Saves deployment address to `deployments/mainnet.json`

### Deployment File Structure

After successful deployment, `deployments/mainnet.json` contains:

```json
{
  "loanPlugins": {
    "morpho": {
      "endpoint": "0x...",
      "flp": "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"
    },
    "euler": {
      "endpoint": "0x...",
      "flp": "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9"
    },
    "uniswapV3": {
      "endpoint": "0x...",
      "flp": "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
    }
  },
  "swapPlugins": {
    "lifi": {
      "endpoint": "0x...",
      "router": "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
    },
    "oneInch": {
      "endpoint": "0x...",
      "router": "0x111111125421cA6dc452d289314280a0f8842A65"
    },
    "wsteth": {
      "endpoint": "0x...",
      "router": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"
    }
  },
  "CometMultiplier": "0x..."
}
```

### Important Notes

1. **Plugin Dependencies**: All plugins MUST be deployed before the main contract
2. **Network Configuration**: Ensure proper RPC URLs in `hardhat.config.ts`
3. **Verification**: Contracts are auto-verified if ETHERSCAN_API_KEY is configured

## Usage Examples

### Create 2x Leveraged Position with ETH

```solidity
// Authorize contract
IComet(cometUSDC).allow(adapterAddress, true);

// Prepare options
CometMultiplier.Options memory opts = CometMultiplier.Options({
    market: cometUSDC,
    loanPlugin: morphoPlugin,
    swapPlugin: lifiPlugin,
    flp: morphoBlueAddress
});

// Execute with native ETH (automatically wraps to WETH)
adapter.executeMultiplier{value: 1 ether}(
    opts,
    wethAddress,
    0,              // Ignored when sending ETH
    20000,          // 2x leverage
    lifiSwapData,
    1.95 ether      // Min output from swap
);
```

### Create 3x Leveraged Position with Signature

```solidity
// Create EIP-712 signature off-chain
AllowBySig.AllowParams memory allowParams = AllowBySig.AllowParams({
    owner: userAddress,
    manager: adapterAddress,
    isAllowed: true,
    nonce: IComet(cometUSDC).userNonce(userAddress),
    expiry: block.timestamp + 3600,
    v: signature.v,
    r: signature.r,
    s: signature.s
});

// Execute without prior approval transaction
adapter.executeMultiplierBySig(
    opts,
    wethAddress,
    2 ether,
    30000,          // 3x leverage
    lifiSwapData,
    5.85 ether,
    allowParams
);
```

### Reduce Leveraged Position

```solidity
// Authorize contract if not already done
IComet(cometUSDC).allow(adapterAddress, true);

// Prepare options
CometMultiplier.Options memory opts = CometMultiplier.Options({
    market: cometUSDC,
    loanPlugin: morphoPlugin,
    swapPlugin: lifiPlugin,
    flp: morphoBlueAddress
});

// Reduce position by 1 WETH (partial deleverage)
adapter.withdrawMultiplier(
    opts,
    wethAddress,
    1 ether,            // Amount to withdraw
    lifiSwapData,
    2450 * 1e6          // Min USDC from swap
);

// Or close entire position
adapter.withdrawMultiplier(
    opts,
    wethAddress,
    type(uint256).max,  // Withdraw all collateral
    lifiSwapData,
    4900 * 1e6          // Min USDC from swap (full position)
);
```

### Reduce Leveraged Position with Signature

```solidity
// Create EIP-712 signature off-chain
AllowBySig.AllowParams memory allowParams = AllowBySig.AllowParams({
    owner: userAddress,
    manager: adapterAddress,
    isAllowed: true,
    nonce: IComet(cometUSDC).userNonce(userAddress),
    expiry: block.timestamp + 3600,
    v: signature.v,
    r: signature.r,
    s: signature.s
});

// Execute deleverage without prior approval
adapter.withdrawMultiplierBySig(
    opts,
    wethAddress,
    1 ether,            // Amount to withdraw
    lifiSwapData,
    2450 * 1e6,
    allowParams
);
```
