# CometFoundation Documentation

## Overview

`CometFoundation` is a unified contract that provides three core DeFi operations on Compound V3 (Comet) markets:

1. **Multiply**: Create leveraged collateral positions using flash loans
2. **Cover**: Reduce or close leveraged positions
3. **Exchange**: Swap collateral assets within a position

All operations use flash loans and maintain atomic execution with plugin-based architecture for maximum flexibility and gas efficiency.

## Key Features

- **Unified Interface**: Single contract for multiply, cover, and exchange operations
- **Flash Loan Integration**: Support for multiple providers (AAVE, Balancer, Euler V2, Morpho, Uniswap V3)
- **DEX Aggregation**: Optimal swaps via LiFi, 1inch, and specialized plugins
- **Gasless Approvals**: EIP-712 signature support for all operations
- **Plugin Architecture**: Modular, extensible design
- **Native ETH Support**: Direct ETH deposits with automatic WETH wrapping
- **Transient Storage**: EIP-1153 for gas-efficient temporary data
- **Health Factor Protection**: Ensures safe collateral swaps

## Architecture

### Core Components

1. **CometFoundation**: Main contract orchestrating all operations
2. **Flash Loan Plugins**:
   - AAVEPlugin
   - BalancerPlugin
   - EulerV2Plugin
   - MorphoPlugin
   - UniswapV3Plugin
3. **Swap Plugins**:
   - LiFiPlugin
   - OneInchV6Plugin
   - WstEthPlugin
4. **Interfaces**:
   - ICometMultiplier
   - ICometCover
   - ICometExchange
   - ICometFoundation

## Contract Interface

### Core Operations

#### 1. Multiply (Create Leverage)

Opens or increases a leveraged position.

```solidity
function multiply(
  ICS.Options calldata opts,
  IERC20 collateral,
  uint256 collateralAmount,
  uint256 leverage,
  bytes calldata swapData
) external payable nonReentrant;

// With signature
function multiply(
  ICS.Options calldata opts,
  IERC20 collateral,
  uint256 collateralAmount,
  uint256 leverage,
  bytes calldata swapData,
  ICS.AllowParams calldata allowParams
) external payable nonReentrant;
```

**Parameters:**

- `opts.comet`: Comet market address
- `opts.loanPlugin`: Flash loan plugin address
- `opts.swapPlugin`: Swap plugin address
- `collateral`: Collateral token address
- `collateralAmount`: Initial collateral amount (ignored if sending ETH)
- `leverage`: Leverage in basis points (15000 = 1.5x, 20000 = 2x)
- `swapData`: Encoded swap data from aggregator
- `allowParams`: Optional EIP-712 signature for gasless approval

#### 2. Cover (Reduce Leverage)

Reduces or closes a leveraged position.

```solidity
function cover(
  ICS.Options calldata opts,
  IERC20 collateral,
  uint256 collateralAmount,
  bytes calldata swapData
) external nonReentrant;

// With signature
function cover(
  ICS.Options calldata opts,
  IERC20 collateral,
  uint256 collateralAmount,
  bytes calldata swapData,
  ICS.AllowParams calldata allowParams
) external nonReentrant;
```

**Parameters:**

- Same as multiply, except:
- `collateralAmount`: Amount to withdraw (use `type(uint256).max` for full close)

#### 3. Exchange (Swap Collateral)

Swaps one collateral type for another within a position.

```solidity
function exchange(
  ICS.Options calldata opts,
  IERC20 fromAsset,
  IERC20 toAsset,
  uint256 fromAmount,
  uint256 minAmountOut,
  uint256 maxHealthFactorDrop,
  bytes calldata swapData
) external nonReentrant;

// With signature
function exchange(
  ICS.Options calldata opts,
  IERC20 fromAsset,
  IERC20 toAsset,
  uint256 fromAmount,
  uint256 minAmountOut,
  uint256 maxHealthFactorDrop,
  bytes calldata swapData,
  ICS.AllowParams calldata allowParams
) external nonReentrant;
```

**Parameters:**

- `opts`: Market and plugin options
- `fromAsset`: Source collateral token
- `toAsset`: Destination collateral token
- `fromAmount`: Amount to swap
- `minAmountOut`: Minimum output (slippage protection)
- `maxHealthFactorDrop`: Max health factor drop in basis points
- `swapData`: Swap aggregator calldata
- `allowParams`: Optional signature

### Structs

```solidity
// Core operation options
struct Options {
  IComet comet; // Compound V3 market
  address loanPlugin; // Flash loan plugin address
  address swapPlugin; // Swap plugin address
}

// EIP-712 signature parameters
struct AllowParams {
  uint256 nonce;
  uint256 expiry;
  uint8 v;
  bytes32 r;
  bytes32 s;
}

// Plugin configuration
struct Plugin {
  address endpoint; // Plugin contract address
  bytes config; // Plugin-specific configuration
}

// Uniswap V3 pool mapping (used in UniswapV3Plugin config)
struct Pool {
  address token; // Token address
  address pool; // Uniswap V3 pool address for that token
}
```

## Usage Examples

### 1. Create 2x Leveraged Position (Native ETH)

```solidity
// Get swap data from LiFi API
bytes memory swapData = getLiFiSwapData(
    wethAddress,
    usdcAddress,
    flashLoanAmount
);

ICS.Options memory opts = ICS.Options({
    comet: IComet(COMET_USDC_MARKET),
    loanPlugin: eulerV2PluginAddress,
    swapPlugin: lifiPluginAddress
});

// Send ETH directly (automatically wraps to WETH)
cometFoundation.multiply{value: 1 ether}(
    opts,
    IERC20(WETH_ADDRESS),
    0,                  // Ignored when sending ETH
    20000,              // 2x leverage
    swapData
);
```

**Note**: Plugins are pre-configured during deployment with their respective addresses (EVault for Euler, Router for LiFi, etc.)

### 2. Create 3x Leveraged Position with ERC20

```solidity
// Approve collateral
IERC20(wethAddress).approve(cometFoundationAddress, 2 ether);

// Authorize CometFoundation on Comet
IComet(COMET_USDC_MARKET).allow(cometFoundationAddress, true);

ICS.Options memory opts = ICS.Options({
    comet: IComet(COMET_USDC_MARKET),
    loanPlugin: uniswapV3PluginAddress,  // Using Uniswap V3
    swapPlugin: oneInchPluginAddress
});

// Note: UniswapV3Plugin automatically selects the correct pool
// based on the token-to-pool mappings in its config
cometFoundation.multiply(
    opts,
    IERC20(WETH_ADDRESS),
    2 ether,            // 2 WETH initial
    30000,              // 3x leverage
    oneInchSwapData
);
```

**How Uniswap V3 Plugin Works:**
When you use UniswapV3Plugin, it will:

1. Look up the base asset token (e.g., USDC) in its config
2. Find the corresponding pool address
3. Execute flash loan from that specific pool
4. The plugin config must include a mapping for the base asset

### 3. Create Position with Gasless Approval

```solidity
// Generate EIP-712 signature off-chain
ICS.AllowParams memory allowParams = ICS.AllowParams({
    nonce: IComet(COMET_USDC_MARKET).userNonce(msg.sender),
    expiry: block.timestamp + 3600,
    v: signature.v,
    r: signature.r,
    s: signature.s
});

// Execute without prior allow() call
cometFoundation.multiply(
    opts,
    IERC20(WETH_ADDRESS),
    1 ether,
    20000,
    swapData,
    allowParams         // Signature included
);
```

### 4. Partially Close Position

```solidity
// Get swap data for wstETH -> WETH
bytes memory swapData = getLiFiSwapData(
    wstethAddress,
    wethAddress,
    0.5 ether
);

ICS.Options memory opts = ICS.Options({
    comet: IComet(COMET_WETH_MARKET),
    loanPlugin: balancerPluginAddress,
    swapPlugin: wstethPluginAddress
});

// Withdraw 0.5 wstETH
cometFoundation.cover(
    opts,
    IERC20(WSTETH_ADDRESS),
    0.5 ether,
    swapData
);
```

### 5. Fully Close Position

```solidity
// Use max uint256 to close entire position
cometFoundation.cover(
    opts,
    IERC20(WETH_ADDRESS),
    type(uint256).max,  // Close all
    swapData
);
```

### 6. Swap Collateral (WETH -> wstETH)

```solidity
ICS.Options memory opts = ICS.Options({
    comet: IComet(COMET_WETH_MARKET),
    loanPlugin: aavePluginAddress,
    swapPlugin: lifiPluginAddress
});

cometFoundation.exchange(
    opts,
    IERC20(WETH_ADDRESS),     // From
    IERC20(WSTETH_ADDRESS),   // To
    1 ether,                  // Amount to swap
    0.95 ether,               // Min output
    500,                      // Max 5% health factor drop
    swapData
);
```

## Deployment Guide

### Prerequisites

```bash
# Install dependencies
pnpm install

# Compile contracts
pnpm compile
```

### Step 1: Deploy Flash Loan Plugins

```bash
# AAVE Plugin
npx hardhat run scripts/deploy/plugins/flashloan/aave.ts --network mainnet

# Balancer Plugin
npx hardhat run scripts/deploy/plugins/flashloan/balancer.ts --network mainnet

# Euler V2 Plugin
npx hardhat run scripts/deploy/plugins/flashloan/eulerv2.ts --network mainnet

# Morpho Plugin
npx hardhat run scripts/deploy/plugins/flashloan/morpho.ts --network mainnet

# Uniswap V3 Plugin
npx hardhat run scripts/deploy/plugins/flashloan/uniswapv3.ts --network mainnet
```

### Step 2: Deploy Swap Plugins

```bash
# LiFi Plugin
npx hardhat run scripts/deploy/plugins/swap/lifi.ts --network mainnet

# 1inch Plugin
npx hardhat run scripts/deploy/plugins/swap/oneinch.ts --network mainnet

# wstETH Plugin
npx hardhat run scripts/deploy/plugins/swap/wsteth.ts --network mainnet
```

### Step 3: Deploy CometFoundation

```bash
npx hardhat run scripts/deploy/foundation.ts --network mainnet
```

**Deployment script example:**

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Load deployed plugins
  const deployments = require("../deployments/mainnet.json");

  // IMPORTANT: All plugins MUST have config - never use "0x"
  const plugins = [
    // Flash Loan Plugins
    {
      endpoint: deployments.plugins.aave.address,
      config: ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        ["0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"], // AAVE Pool
      ),
    },
    {
      endpoint: deployments.plugins.balancer.address,
      config: ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        ["0xBA12222222228d8Ba445958a75a0704d566BF2C8"], // Balancer Vault
      ),
    },
    {
      endpoint: deployments.plugins.euler.address,
      config: ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        ["0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2"], // EVault
      ),
    },
    {
      endpoint: deployments.plugins.morpho.address,
      config: ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        ["0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"], // Morpho Blue
      ),
    },
    {
      endpoint: deployments.plugins.uniswapv3.address,
      config: ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address token, address pool)[]"],
        [
          [
            {
              token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
              pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640", // USDC/WETH 0.05%
            },
            {
              token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
              pool: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // USDC/WETH 0.3%
            },
          ],
        ],
      ),
    },
    // Swap Plugins
    {
      endpoint: deployments.plugins.lifi.address,
      config: ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        ["0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"], // LiFi Router
      ),
    },
    {
      endpoint: deployments.plugins.oneinch.address,
      config: ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        ["0x111111125421cA6dc452d289314280a0f8842A65"], // 1inch Aggregator
      ),
    },
    {
      endpoint: deployments.plugins.wsteth.address,
      config: "0x",
    },
  ];

  // Deploy CometFoundation
  const CometFoundation = await ethers.getContractFactory("CometFoundation");
  const foundation = await CometFoundation.deploy(
    plugins,
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  );

  await foundation.waitForDeployment();
  console.log("CometFoundation deployed:", await foundation.getAddress());
}

main();
```

### Deployment File Structure

`deployments/mainnet.json`:

```json
{
  "plugins": {
    "flashloan": {
      "aave": {
        "address": "0x...",
        "config": {
          "pool": "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
        }
      },
      "balancer": {
        "address": "0x...",
        "config": {
          "vault": "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
        }
      },
      "euler": {
        "address": "0x...",
        "config": {
          "evault": "0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2"
        }
      },
      "morpho": {
        "address": "0x...",
        "config": {
          "morphoBlue": "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"
        }
      },
      "uniswapv3": {
        "address": "0x...",
        "config": {
          "pools": [
            {
              "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              "pool": "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
            },
            {
              "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              "pool": "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
            }
          ]
        }
      }
    },
    "swap": {
      "lifi": {
        "address": "0x...",
        "config": {
          "router": "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
        }
      },
      "oneinch": {
        "address": "0x...",
        "config": {
          "aggregator": "0x111111125421cA6dc452d289314280a0f8842A65"
        }
      },
      "wsteth": {
        "address": "0x...",
        "config": {
          "wsteth": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
          "steth": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
          "fallbackPlugin": "0x...",
          "fallbackConfig": "0x..."
        }
      }
    }
  },
  "CometFoundation": "0x..."
}
```

## Plugin Configuration

⚠️ **CRITICAL**: All plugins require proper configuration - **never use `"0x"` or empty config**. The contract will reject plugins without valid configuration.

### Flash Loan Plugins

**All flash loan plugins require config** - no config can be null/empty.

**AAVE**: Requires pool address

```solidity
config: ethers.AbiCoder.defaultAbiCoder().encode(
  ["address"],
  [AAVE_POOL] // 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
)
```

**Balancer**: Requires vault address

```solidity
config: ethers.AbiCoder.defaultAbiCoder().encode(
  ["address"],
  [BALANCER_VAULT] // 0xBA12222222228d8Ba445958a75a0704d566BF2C8
)
```

**Euler V2**: Requires EVault address

```solidity
config: ethers.AbiCoder.defaultAbiCoder().encode(
  ["address"],
  [EVAULT_ADDRESS] // e.g., 0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2
)
```

**Morpho**: Requires Morpho Blue address

```solidity
config: ethers.AbiCoder.defaultAbiCoder().encode(
  ["address"],
  [MORPHO_BLUE] // 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
)
```

**Uniswap V3**: **SPECIAL CASE** - Requires array of token-to-pool mappings

```solidity
// Structure for token-to-pool mapping
struct Pool {
    address token;  // Token address (e.g., USDC)
    address pool;   // Uniswap V3 pool address for that token
}

// Encode array of pools (supports multiple tokens/fee tiers)
ICS.Pool[] memory pools = new ICS.Pool[](2);
pools[0] = ICS.Pool({
    token: USDC_ADDRESS,
    pool: USDC_WETH_005_POOL  // 0.05% fee tier pool
});
pools[1] = ICS.Pool({
    token: WETH_ADDRESS,
    pool: USDC_WETH_03_POOL   // 0.3% fee tier pool
});

config: ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address token, address pool)[]"],
    [pools]
)

// TypeScript example:
const config = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address token, address pool)[]"],
    [[
        {
            token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
            pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"   // USDC/WETH 0.05%
        },
        {
            token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            pool: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"   // USDC/WETH 0.3%
        }
    ]]
);
```

**Why is Uniswap V3 different?**

- Each token can have multiple pools with different fee tiers (0.05%, 0.3%, 1%)
- Plugin needs to know which pool to use for which token
- Allows optimal routing based on liquidity and fees

**Common Uniswap V3 Pools (Mainnet):**

| Pair      | Fee Tier | Pool Address                               | Best For                      |
| --------- | -------- | ------------------------------------------ | ----------------------------- |
| USDC/WETH | 0.05%    | 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640 | Stablecoin swaps, high volume |
| USDC/WETH | 0.3%     | 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8 | Most liquid, general use      |
| WETH/USDT | 0.05%    | 0x11b815efB8f581194ae79006d24E0d814B7697F6 | Stablecoin swaps              |
| WETH/USDT | 0.3%     | 0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36 | General use                   |
| WBTC/WETH | 0.3%     | 0xCBCdF9626bC03E24f779434178A73a0B4bad62eD | Bitcoin/ETH swaps             |

**Fee Tier Selection Guide:**

- **0.05%**: Best for stablecoin pairs or highly correlated assets
- **0.3%**: Most common, suitable for most token pairs
- **1%**: For exotic pairs or low liquidity tokens

### Swap Plugins

**All swap plugins require config** - no config can be null/empty.

**LiFi**: Requires router address

```solidity
config: ethers.AbiCoder.defaultAbiCoder().encode(
  ["address"],
  [LIFI_ROUTER] // 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE
)
```

**1inch**: Requires aggregator address

```solidity
config: ethers.AbiCoder.defaultAbiCoder().encode(
  ["address"],
  [ONEINCH_AGGREGATOR] // 0x111111125421cA6dc452d289314280a0f8842A65
)
```

**WstETH**: Requires complex configuration (wstETH, stETH, fallback plugin, fallback config)

```solidity
// First encode fallback plugin config (e.g., LiFi)
bytes memory fallbackConfig = ethers.AbiCoder.defaultAbiCoder().encode(
  ["address"],
  [LIFI_ROUTER]
);

// Then encode full WstETH config
config: ethers.AbiCoder.defaultAbiCoder().encode(
  ["address", "address", "address", "bytes"],
  [
    WSTETH_ADDRESS,      // 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0
    STETH_ADDRESS,       // 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84
    LIFI_PLUGIN_ADDRESS, // Fallback plugin for wstETH -> WETH swaps
    fallbackConfig       // Config for fallback plugin
  ]
)
```

### Helper Functions for Config Encoding

```typescript
// Helper to encode standard plugin config (single address)
function encodePluginConfig(address: string): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(["address"], [address]);
}

// Helper to encode Uniswap V3 plugin config (token-to-pool mappings)
function encodeUniswapV3Config(
  pools: { token: string; pool: string }[],
): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address token, address pool)[]"],
    [pools],
  );
}

// Helper to encode WstETH plugin config
function encodeWstEthConfig(
  wsteth: string,
  steth: string,
  fallbackPlugin: string,
  fallbackRouter: string,
): string {
  const fallbackConfig = encodePluginConfig(fallbackRouter);

  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "address", "bytes"],
    [wsteth, steth, fallbackPlugin, fallbackConfig],
  );
}

// Usage examples
const lifiConfig = encodePluginConfig(LIFI_ROUTER);

const uniswapV3Config = encodeUniswapV3Config([
  { token: USDC_ADDRESS, pool: USDC_WETH_005_POOL },
  { token: WETH_ADDRESS, pool: USDC_WETH_03_POOL },
]);

const wstethConfig = encodeWstEthConfig(
  WSTETH_ADDRESS,
  STETH_ADDRESS,
  lifiPluginAddress,
  LIFI_ROUTER,
);
```

## Security Considerations

### 1. Health Factor Validation (Exchange only)

```solidity
// Ensures collateral swaps maintain safe positions
function _validateExchange(...) internal view {
    uint256 assetFromLiquidity = calculateLiquidity(fromAsset, fromAmount);
    uint256 assetInLiquidity = calculateLiquidity(toAsset, minAmountOut);

    require(
        assetFromLiquidity * (PRECISION - maxHealthFactorDrop) / PRECISION < assetInLiquidity,
        ICA.InsufficientLiquidity()
    );
}
```

### 2. Plugin Authorization

Only registered plugins can execute:

```solidity
function _config(
  address plugin,
  bytes4 selector
) internal view returns (bytes memory) {
  bytes32 key = keccak256(abi.encodePacked(plugin, selector));
  bytes memory configWithMagic = plugins[key];
  require(configWithMagic[0] == PLUGIN_MAGIC, ICA.UnknownPlugin());
  // ...
}
```

### 3. Balance Verification

Exact balance checks throughout execution:

```solidity
require(
    data.asset.balanceOf(address(this)) >= snapshot + data.debt,
    ICA.InvalidAmountOut()
);
```

### 4. Transient Storage

Prevents state manipulation:

```solidity
function _tstore(...) internal {
    bytes32 slot = SLOT_FOUNDATION;
    assembly {
        tstore(slot, mode)
        tstore(add(slot, SNAPSHOT_OFFSET), snapshot)
        // ...
    }
}
```

## Gas Optimization

- **Transient Storage (EIP-1153)**: ~20k gas saved per operation
- **Delegatecall Pattern**: Reduced contract size
- **Batch Operations**: Single atomic transaction
- **Plugin Registry**: O(1) lookups via mapping

## Error Handling

Common errors and their meanings:

- `InvalidComet`: Invalid Comet market address
- `UnknownPlugin`: Plugin not registered
- `InvalidAmountOut`: Insufficient output from swap
- `InvalidAmountIn`: Invalid input amount
- `InvalidLeverage`: Leverage calculation failed
- `InsufficientLiquidity`: Health factor would drop too much
- `InvalidMode`: Invalid operation mode
- `NothingToDeleverage`: No debt to repay

## Testing

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test test/multiplier/lifi/wsteth-adapter.test.ts

# Run with gas reporting
REPORT_GAS=true pnpm test

# Run with verbose logging
pnpm test:vvv
```

## Support

For issues and questions:

- Documentation: Review `/documentation`
- Tests: Check `/test` directory for examples

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**License**: MIT
