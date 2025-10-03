# Comet Multiplier Adapter

A modular smart contract system for creating leveraged positions on Compound v3 (Comet) markets using flash loans and DEX aggregators.

## Overview

The Comet Multiplier Adapter enables users to create leveraged collateral positions in a single transaction by:

1. Taking a flash loan from lending protocols (Morpho, Euler, UniswapV3)
2. Swapping borrowed base assets to collateral via DEX aggregators (LiFi, 1inch)
3. Depositing collateral into Compound v3 and borrowing against it
4. Repaying the flash loan

This creates a leveraged position without requiring multiple manual transactions.

## Architecture

The system uses a plugin-based architecture:

```
CometMultiplierAdapter & CometCollateralSwap
├── Loan Plugins (Flash Loan Sources)
│   ├── MorphoPlugin - Morpho Blue flash loans
│   ├── EulerV2Plugin - Euler V2 flash loans
│   ├── AAVEPlugin - AAVE flash loans
│   ├── BalancerPlugin - Balancer vault flash loans
│   └── UniswapV3Plugin - Uniswap V3 flash swaps
│
└── Swap Plugins (DEX Aggregators)
    ├── LiFiPlugin - LiFi cross-chain swaps
    ├── OneInchV6SwapPlugin - 1inch v6 aggregator
    └── WstEthPlugin - wstETH wrapping/unwrapping
```

### Collateral Swap Flow

The `CometCollateralSwap` contract enables users to swap collateral in their Compound v3 position without closing their borrowing position:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COLLATERAL SWAP FLOW (WETH → USDC)                      │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER INITIATES SWAP
   User ──► CometCollateralSwap.swap(fromAsset: WETH, toAsset: USDC)

2. HEALTH FACTOR VALIDATION
   CometCollateralSwap ──► Validates position safety after swap

3. FLASH LOAN REQUEST
   CometCollateralSwap ──► FlashLoanPlugin.takeFlashLoan(1000 USDC)
   FlashLoanPlugin ──► AAVE/Balancer/Uniswap.flashLoan(1000 USDC)

4. FLASH LOAN CALLBACK
   AAVE/Balancer/Uniswap ──► CometCollateralSwap.fallback()
   ✅ Contract Balance: +1000 USDC

5. SUPPLY BORROWED ASSET
   CometCollateralSwap ──► Comet.supplyTo(user, 1000 USDC)
   ✅ User's USDC collateral increases, health factor improves

6. WITHDRAW EXISTING COLLATERAL
   CometCollateralSwap ──► Comet.withdrawFrom(user, 0.5 WETH)
   ✅ Contract Balance: 1000 USDC + 0.5 WETH

7. SWAP WITHDRAWN COLLATERAL
   CometCollateralSwap ──► SwapPlugin.executeSwap(0.5 WETH → USDC)
   SwapPlugin ──► 1inch/LiFi.swap(0.5 WETH → 1005 USDC)
   ✅ Contract Balance: 2005 USDC total

8. SUPPLY DUST BACK TO USER
   CometCollateralSwap ──► Comet.supplyTo(user, dust USDC)
   ✅ Excess USDC supplied back to user's position

9. REPAY FLASH LOAN
   CometCollateralSwap ──► FlashLoanPlugin.repayFlashLoan(1005 USDC)
   FlashLoanPlugin ──► AAVE/Balancer/Uniswap.repay(1000 + 5 fee)
   ✅ Contract Balance: 0

RESULT: User's collateral successfully swapped from WETH to USDC in Comet
```

### Token Flow Breakdown

| Stage           | Contract Balance         | Action                        | External Call                    |
| --------------- | ------------------------ | ----------------------------- | -------------------------------- |
| **Initial**     | 0                        | User calls `swap()`           | -                                |
| **Flash Loan**  | +1000 USDC               | Flash loan received           | `FlashProvider.flashLoan()`      |
| **Supply**      | 1000 USDC                | Supply borrowed asset to user | `Comet.supplyTo(user, USDC)`     |
| **Withdraw**    | 1000 USDC<br/>+0.5 WETH  | Withdraw user's collateral    | `Comet.withdrawFrom(user, WETH)` |
| **Swap**        | ~2005 USDC<br/>-0.5 WETH | Swap withdrawn collateral     | `DEX.swap(WETH → USDC)`          |
| **Supply Dust** | ~1005 USDC               | Supply excess back to user    | `Comet.supplyTo(user, dust)`     |
| **Repay**       | 0                        | Repay flash loan + fee        | `FlashProvider.repay(1005 USDC)` |

### Key Features

- **Health Factor Protection**: Validates position remains safe before execution
- **Multi-Protocol Support**: Works with AAVE, Balancer, Uniswap V3, Morpho, Euler
- **Optimal Routing**: Uses 1inch and LiFi for best swap execution
- **Gas Efficiency**: Delegate calls and transient storage minimize gas costs
- **Dust Management**: Automatically supplies leftover tokens back to user's position

## Modules

### Core Contract

**CometMultiplierAdapter** - Main contract that orchestrates flash loans, swaps, and Comet interactions

- `executeMultiplier()` - Create leveraged position
- `withdrawMultiplier()` - Reduce or close leveraged position

### Loan Plugins

**MorphoPlugin** - Flash loans from Morpho Blue

- Zero-fee flash loans
- High liquidity for major assets
- ERC-3156 compliant

**EulerV2Plugin** - Flash loans from Euler V2 vaults

- Vault-specific liquidity
- Competitive fees
- Per-vault flash loan support

**UniswapV3Plugin** - Flash swaps from Uniswap V3 pools

- Decentralized liquidity source
- No permission required
- Pool-specific availability

### Swap Plugins

**LiFiPlugin** - DEX aggregation via LiFi Diamond

- Cross-chain swap support
- Multi-DEX routing
- Optimal execution prices

**OneInchV6SwapPlugin** - 1inch v6 aggregator

- Best price discovery
- Gas optimization
- Limit order support

**WstEthPlugin** - wstETH wrapping/unwrapping

- Direct Lido integration
- Efficient stETH <-> wstETH conversion
- No slippage for wrapping

## Supported Networks

- **Mainnet** - Full plugin support (Morpho, Euler, UniV3, LiFi, 1inch, wstETH)

## Installation

Prerequisites: [Node.js](https://nodejs.org/en/download/package-manager) 22.10+ with `pnpm` and [Visual Studio Code](https://code.visualstudio.com/download).

```shell
pnpm i
```

## Configuration

Edit `scripts/deploy/deploy.config.ts` to configure deployment for each network:

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
    markets: [
      {
        comet: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
        baseToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        baseSymbol: "USDC",
        collaterals: [
          {
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            symbol: "WETH",
          },
          // ...
        ],
      },
    ],
  },
};
```

## Documentation

This project includes detailed documentation for its core components:

- **[CometCollateralSwap](./documentation/CometCollateralSwap.md)** - Comprehensive documentation for the main collateral swap contract, including architecture, usage patterns, and integration examples.

- **[Flash Loan Plugins](./documentation/plugins/FlashPlugins.md)** - Complete guide to the modular flash loan plugin system, covering the unified interface, validation mechanisms, and available protocol integrations (AAVE, Balancer, Uniswap V3, Euler V2, Morpho, etc.).

- **[Swap Plugins](./documentation/plugins/SwapPlugins.md)** - Detailed documentation for the modular swap plugin system, including the unified interface, validation logic, and integrations with DEX protocols and aggregators (1inch V6, LiFi, cross-chain swaps).

## Some unsorted notes

Deploy to any configured network:

```shell
npx hardhat run scripts/deploy/deploy.main.ts --network mainnet
```

Deployment addresses are saved to `deployments/{network}.json`

## Testing

Run all tests:

```shell
pnpm test
```

Coverage:

```shell
pnpm coverage
```
