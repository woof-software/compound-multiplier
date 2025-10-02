export interface CollateralConfig {
    address: string;
    symbol: string;
}

export interface MarketConfig {
    comet: string;
    baseToken: string;
    baseSymbol: string;
    collaterals: CollateralConfig[];
}

export interface PluginConfig {
    loanPlugins: {
        morpho?: string;
        euler?: string;
        uniswapV3?: string;
    };
    swapPlugins: {
        lifi: string;
        oneInch: string;
        wsteth?: string;
    };
}

export interface DeployConfig {
    weth: string;
    plugins: PluginConfig;
}

export const deployConfig: Record<string, DeployConfig> = {
    mainnet: {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        plugins: {
            loanPlugins: {
                morpho: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
                euler: "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9",
                uniswapV3: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
            },
            swapPlugins: {
                lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",
                oneInch: "0x111111125421cA6dc452d289314280a0f8842A65",
                wsteth: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"
            }
        }
    }
};
