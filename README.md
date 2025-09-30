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
CometMultiplierAdapter
├── Loan Plugins (Flash Loan Sources)
│   ├── MorphoPlugin - Morpho Blue flash loans
│   ├── EulerV2Plugin - Euler V2 flash loans
│   └── UniswapV3Plugin - Uniswap V3 flash swaps
│
└── Swap Plugins (DEX Aggregators)
    ├── LiFiPlugin - LiFi cross-chain swaps
    ├── OneInchV6SwapPlugin - 1inch v6 aggregator
    └── WstEthPlugin - wstETH wrapping/unwrapping
```

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

- **[CompoundV3CollateralSwap](./documentation/CompoundV3CollateralSwap.md)** - Comprehensive documentation for the main collateral swap contract, including architecture, usage patterns, and integration examples.

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
