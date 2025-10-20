export interface DeployConfig {
    weth: string;
    plugins: {
        loanPlugins: {
            morpho: string;
            euler: Array<{
                token: string;
                pool: string;
            }>;
            uniswapV3Pools: Array<{
                token: string;
                pool: string;
            }>;
            aave: string;
            balancer: string;
        };
        swapPlugins: {
            lifi: string;
            oneInch: string;
        };
    };
}

export const deployConfig: Record<string, DeployConfig> = {
    mainnet: {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        plugins: {
            loanPlugins: {
                morpho: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", // Morpho Blue
                euler: [
                    {
                        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
                        pool: "0x27182842E098f60e3D576794A5bFFb0777E025d3" // Euler V2 USDC eVault
                    }
                ],
                uniswapV3Pools: [
                    {
                        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
                        pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640" // USDC/WETH 0.05%
                    },
                    {
                        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                        pool: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8" // USDC/WETH 0.3%
                    },
                    {
                        token: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
                        pool: "0x11b815efB8f581194ae79006d24E0d814B7697F6" // WETH/USDT 0.05%
                    }
                ],
                aave: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", // AAVE V3 Pool (optional)
                balancer: "0xBA12222222228d8Ba445958a75a0704d566BF2C8" // Balancer Vault (optional)
            },
            swapPlugins: {
                lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // LiFi Diamond
                oneInch: "0x111111125421cA6dc452d289314280a0f8842A65" // 1inch v6 Aggregator
            }
        }
    }
};

export function validateConfig(config: DeployConfig): void {
    if (!config.weth) {
        throw new Error("WETH address is required");
    }
    if (!config.plugins.loanPlugins.morpho) {
        throw new Error("Morpho Blue address is required");
    }
    if (!config.plugins.loanPlugins.euler || config.plugins.loanPlugins.euler.length === 0) {
        throw new Error("At least one Euler V2 vault mapping is required");
    }
    if (!config.plugins.loanPlugins.uniswapV3Pools || config.plugins.loanPlugins.uniswapV3Pools.length === 0) {
        throw new Error("At least one Uniswap V3 pool mapping is required");
    }
    if (!config.plugins.swapPlugins.lifi) {
        throw new Error("LiFi router address is required");
    }
    if (!config.plugins.swapPlugins.oneInch) {
        throw new Error("1inch aggregator address is required");
    }
    console.log("Configuration validated successfully");
}
