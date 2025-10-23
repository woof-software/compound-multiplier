import { envs, Network } from "./deploy.constant";

export interface DeployConfig {
    treasury: string;
    weth: string;
    plugins: {
        loanPlugins: {
            morpho?: string;
            euler?: Array<{
                token: string;
                pool: string;
            }>;
            uniswapV3?: Array<{
                token: string;
                pool: string;
            }>;
            uniswapV4?: string;
            aave?: string;
            balancer?: string;
        };
        swapPlugins: {
            lifi: string;
            oneInch?: string;
        };
    };
}

const MAINNET = envs(Network.Mainnet)!;
const BASE = envs(Network.Base)!;
const POLYGON = envs(Network.Polygon)!;
const OPTIMISM = envs(Network.Optimism)!;
const LINEA = envs(Network.Linea)!;
const ARBITRUM = envs(Network.Arbitrum)!;
const UNICHAIN = envs(Network.Unichain)!;

export const deployConfig: Record<string, DeployConfig> = {
    mainnet: {
        treasury: MAINNET.treasury,
        weth: MAINNET.tokens.WETH,
        plugins: {
            loanPlugins: {
                morpho: MAINNET.protocols.morpho,
                euler: [
                    { token: MAINNET.tokens.USDC, pool: MAINNET.pools.euler.USDC }, // USDC
                    { token: MAINNET.tokens.USDT, pool: MAINNET.pools.euler.USDT }, // USDT
                    { token: MAINNET.tokens.WETH, pool: MAINNET.pools.euler.WETH }, // WETH
                    // {
                    //     token: MaINNET.tokens.COMP,
                    //     pool:  NO ACTIVE POOL
                    // },
                    { token: MAINNET.tokens.WBTC, pool: MAINNET.pools.euler.WBTC }, // WBTC
                    // {
                    //     token: MAINNET.tokens.UNI,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: MAINNET.tokens.LINK,
                    //     pool: LOW LIQUIDITY
                    // },
                    { token: MAINNET.tokens.wstETH, pool: MAINNET.pools.euler.wstETH }, // wstETH
                    { token: MAINNET.tokens.weETH, pool: MAINNET.pools.euler.weETH }, // weETH
                    // {
                    //     token: MAINNET.tokens.tBTC,
                    //     pool: NO ACTIVE POOL
                    // }
                    { token: MAINNET.tokens.cbBTC, pool: MAINNET.pools.euler.cbBTC }, // cbBTC
                    { token: MAINNET.tokens.USDe, pool: MAINNET.pools.euler.USDe }, // USDe
                    { token: MAINNET.tokens.LBTC, pool: MAINNET.pools.euler.LBTC }, // LBTC
                    { token: MAINNET.tokens.USDS, pool: MAINNET.pools.euler.USDS }, // USDS
                    // {
                    //     token: MAINNET.tokens.pumpBTC,
                    //     pool: NO ACTIVE POOL
                    // }
                    { token: MAINNET.tokens.rsETH, pool: MAINNET.pools.euler.rsETH }, // rsETH
                    { token: MAINNET.tokens.ezETH, pool: MAINNET.pools.euler.ezETH } // ezETH
                    // {
                    //     token: MAINNET.tokens.sUSDS,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: MAINNET.tokens.sFRAX,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: MAINNET.tokens.osETH,
                    //     pool: NO ACTIVE POOL
                    // },
                    // {
                    //     token: MAINNET.tokens.ETHx,
                    //     pool: NO ACTIVE POOL
                    // },
                    // {
                    //     token: MAINNET.tokens.rswETH,
                    //     pool: LOW LIQUIDITY
                    // }.
                ],
                uniswapV3: [
                    { token: MAINNET.tokens.USDC, pool: MAINNET.pools.uniswapV3.USDC }, // USDC / WBTC 0.3%
                    { token: MAINNET.tokens.USDT, pool: MAINNET.pools.uniswapV3.USDT }, // USDT / WETH 0.3%
                    { token: MAINNET.tokens.WETH, pool: MAINNET.pools.uniswapV3.WETH }, // WETH / USDT 0.3%
                    { token: MAINNET.tokens.COMP, pool: MAINNET.pools.uniswapV3.COMP }, // COMP / WETH 0.3%
                    { token: MAINNET.tokens.WBTC, pool: MAINNET.pools.uniswapV3.WBTC }, // WBTC / USDC 0.3%
                    { token: MAINNET.tokens.UNI, pool: MAINNET.pools.uniswapV3.UNI }, // UNI / WETH 0.3%
                    { token: MAINNET.tokens.LINK, pool: MAINNET.pools.uniswapV3.LINK }, // LINK / WETH 0.3%
                    { token: MAINNET.tokens.wstETH, pool: MAINNET.pools.uniswapV3.wstETH }, // WSTETH / ETH 0.01%
                    { token: MAINNET.tokens.weETH, pool: MAINNET.pools.uniswapV3.weETH }, // WEETH / ETH 0.01%
                    { token: MAINNET.tokens.tBTC, pool: MAINNET.pools.uniswapV3.tBTC }, // TBTC / WBTC 0.01%
                    { token: MAINNET.tokens.cbBTC, pool: MAINNET.pools.uniswapV3.cbBTC }, // cbBTC / WBTC 0.01%
                    { token: MAINNET.tokens.USDe, pool: MAINNET.pools.uniswapV3.USDe }, // USDe / USDC 0.01%  TODO: V4 is more liquid, add V4 plugin (0x63bb22f47c7ede6578a25c873e77eb782ec8e4c19778e36ce64d37877b5bd1e7 USDe / USDT 0.0045%)
                    { token: MAINNET.tokens.LBTC, pool: MAINNET.pools.uniswapV3.LBTC }, // LBTC / WBTC 0.05%
                    { token: MAINNET.tokens.USDS, pool: MAINNET.pools.uniswapV3.USDS }, // USDS / DAI 0.3%
                    // {
                    //     token: MAINNET.tokens.pumpBTC,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: MAINNET.tokens.rsETH,
                    //     pool: LOW LIQUIDITY
                    // },
                    //{
                    //    token: MAINNET.tokens.ezETH,
                    //    pool: LOW LIQUIDITY
                    //},
                    { token: MAINNET.tokens.sUSDS, pool: MAINNET.pools.euler.sUSDS } // sUSDS / USDT 0.3% (under 50k) TODO: V4 is more liquid, add V4 plugin (0x51ccd46db78d6988ab156c9b0d023e14b2e848240bc719718e63c4cc5c258bcf USDe / USDT 0.3%)
                    // {
                    //     token: MAINNET.tokens.sFRAX,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: MAINNET.tokens.osETH,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: MAINNET.tokens.ETHx,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: MAINNET.tokens.rswETH,
                    //     pool: LOW LIQUIDITY
                    // }
                ],
                aave: MAINNET.protocols.aave,
                balancer: MAINNET.protocols.balancer,
                uniswapV4: MAINNET.protocols.uniswapV4
            },
            swapPlugins: {
                lifi: MAINNET.protocols.lifi
            }
        }
    },

    linea: {
        treasury: LINEA.treasury,
        weth: LINEA.tokens.WETH,
        plugins: {
            loanPlugins: {
                euler: [
                    { token: LINEA.tokens.wstETH, pool: LINEA.pools.euler.wstETH }, // wstETH
                    // {
                    //     token: LINEA.tokens.WBTC,
                    //     pool: LOW LIQUIDITY
                    // },
                    { token: LINEA.tokens.ezETH, pool: LINEA.pools.euler.ezETH }, // ezETH
                    { token: LINEA.tokens.weETH, pool: LINEA.pools.euler.weETH }, // weETH
                    { token: LINEA.tokens.wrsETH, pool: LINEA.pools.euler.wrsETH }, // wrsETH
                    { token: LINEA.tokens.USDC, pool: LINEA.pools.euler.USDC }, // USDC
                    { token: LINEA.tokens.WETH, pool: LINEA.pools.euler.WETH } // WETH
                ],
                aave: LINEA.protocols.aave
            },
            swapPlugins: {
                lifi: LINEA.protocols.lifi
            }
        }
    },

    arbitrum: {
        treasury: ARBITRUM.treasury,
        weth: ARBITRUM.tokens.WETH,
        plugins: {
            loanPlugins: {
                morpho: ARBITRUM.protocols.morpho,
                euler: [
                    { token: ARBITRUM.tokens.USDC, pool: ARBITRUM.pools.euler.USDC }, // USDC
                    // {
                    //     token: ARBITRUM.tokens.USDCe
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: ARBITRUM.tokens.ARB
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: ARBITRUM.tokens.GMX
                    //     pool: NO ACTIVE POOL
                    // }
                    { token: ARBITRUM.tokens.WETH, pool: ARBITRUM.pools.euler.WETH }, // WETH
                    { token: ARBITRUM.tokens.WBTC, pool: ARBITRUM.pools.euler.WBTC }, // WBTC
                    { token: ARBITRUM.tokens.wstETH, pool: ARBITRUM.pools.euler.wstETH } // wstETH
                    // {
                    //     token: ARBITRUM.tokens.weETH,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: ARBITRUM.tokens.rETH,
                    //     pool: LOW LIQUIDITY
                    // }
                ],
                uniswapV3: [
                    { token: ARBITRUM.tokens.USDC, pool: ARBITRUM.pools.uniswapV3.USDC }, // USDC / WETH 0.05%
                    { token: ARBITRUM.tokens.USDCe, pool: ARBITRUM.pools.uniswapV3.USDCe }, // USDC.e / WETH 0.05%
                    { token: ARBITRUM.tokens.USDT, pool: ARBITRUM.pools.uniswapV3.USDT }, // USDT / WETH 0.3%
                    { token: ARBITRUM.tokens.ARB, pool: ARBITRUM.pools.uniswapV3.ARB }, // ARB / ETH 0.05%
                    { token: ARBITRUM.tokens.GMX, pool: ARBITRUM.pools.uniswapV3.GMX }, // GMX / ETH 1%
                    { token: ARBITRUM.tokens.WETH, pool: ARBITRUM.pools.uniswapV3.WETH }, // WETH / USDC 0.05%
                    { token: ARBITRUM.tokens.WBTC, pool: ARBITRUM.pools.uniswapV3.WBTC }, // WBTC / USDC 0.3%
                    { token: ARBITRUM.tokens.wstETH, pool: ARBITRUM.pools.uniswapV3.wstETH }, // WSTETH / ETH 0.01%
                    { token: ARBITRUM.tokens.weETH, pool: ARBITRUM.pools.uniswapV3.weETH }, // WEETH / ETH 0.01%
                    { token: ARBITRUM.tokens.rETH, pool: ARBITRUM.pools.uniswapV3.rETH } // RETH / ETH 0.05% (under 200k)
                ],
                aave: ARBITRUM.protocols.aave,
                balancer: ARBITRUM.protocols.balancer,
                uniswapV4: ARBITRUM.protocols.uniswapV4
            },
            swapPlugins: {
                lifi: ARBITRUM.protocols.lifi
            }
        }
    },

    unichain: {
        treasury: UNICHAIN.treasury,
        weth: UNICHAIN.tokens.WETH,
        plugins: {
            loanPlugins: {
                morpho: UNICHAIN.protocols.morpho,
                euler: [
                    // {
                    //     token: UNICHAIN.tokens.UNI,
                    //     pool: LOW LIQUIDITY
                    // }
                    { token: UNICHAIN.tokens.wstETH, pool: UNICHAIN.pools.euler.wstETH }, // wstETH (under 200k)
                    { token: UNICHAIN.tokens.weETH, pool: UNICHAIN.pools.euler.weETH }, // weETH
                    { token: UNICHAIN.tokens.ezETH, pool: UNICHAIN.pools.euler.ezETH }, // ezETH (under 100k)
                    { token: UNICHAIN.tokens.WBTC, pool: UNICHAIN.pools.euler.WBTC }, // WBTC (under 100k)
                    { token: UNICHAIN.tokens.USDC, pool: UNICHAIN.pools.euler.USDC }, // USDC
                    { token: UNICHAIN.tokens.WETH, pool: UNICHAIN.pools.euler.WETH } // WETH
                ],
                uniswapV3: [
                    { token: UNICHAIN.tokens.UNI, pool: UNICHAIN.pools.uniswapV3.UNI }, // UNI (under 100k)
                    // {
                    //     token: UNICHAIN.tokens.wstETH,
                    //     pool: NO ACTIVE POOL TODO: V4 has pool ("0xd10d359f50ba8d1e0b6c30974a65bf06895fba4bf2b692b2c75d987d3b6b863d" WSTETH / WETH 0.01%)
                    // },
                    { token: UNICHAIN.tokens.weETH, pool: UNICHAIN.pools.uniswapV3.weETH }, // WEETH / WETH 0.01%
                    // {
                    //     token: UNICHAIN.tokens.ezETH,
                    //     pool: NO ACTIVE POOL TODO: V4 has pool ("0xc36db4be4a3bfded1a98dc1017b01db62f34aa02c92c6febeb277c87a6152ee8" EZETH / WETH 0.01%)
                    // }
                    { token: UNICHAIN.tokens.WBTC, pool: UNICHAIN.pools.uniswapV3.WBTC }, // WBTC / WETH 1% (under 200k) TODO: V4 has pool ("0x764afe9ab22a5c80882918bb4e59b954912b17a22c3524c68a8cf08f7386e08f" WBTC / WETH 0.05%)
                    { token: UNICHAIN.tokens.USDC, pool: UNICHAIN.pools.uniswapV3.USDC }, // USDC / WETH 0.3% TODO: V4 has pool ("0x3258f413c7a88cda2fa8709a589d221a80f6574f63df5a5b6774485d8acc39d9" USDC / WETH 0.05%)
                    { token: UNICHAIN.tokens.WETH, pool: UNICHAIN.pools.uniswapV3.WETH } // WETH / USDC 0.3% TODO: V4 has pool ("0x3258f413c7a88cda2fa8709a589d221a80f6574f63df5a5b6774485d8acc39d9" WETH / USDC 0.05%)
                ],
                uniswapV4: UNICHAIN.protocols.uniswapV4
            },
            swapPlugins: {
                lifi: UNICHAIN.protocols.lifi
            }
        }
    },

    base: {
        treasury: BASE.treasury,
        weth: BASE.tokens.WETH,
        plugins: {
            loanPlugins: {
                morpho: BASE.protocols.morpho,
                euler: [
                    { token: BASE.tokens.USDC, pool: BASE.pools.euler.USDC }, // USDC
                    { token: BASE.tokens.wstETH, pool: BASE.pools.euler.wstETH }, // wstETH (under 200k)
                    { token: BASE.tokens.cbBTC, pool: BASE.pools.euler.cbBTC }, // cbBTC
                    { token: BASE.tokens.cbETH, pool: BASE.pools.euler.cbETH }, // cbETH
                    { token: BASE.tokens.WETH, pool: BASE.pools.euler.WETH }, // WETH
                    { token: BASE.tokens.sUSDS, pool: BASE.pools.euler.sUSDS }, // sUSDS (under 100k)
                    { token: BASE.tokens.AERO, pool: BASE.pools.euler.AERO } // AERO
                    // {
                    //     token: BASE.tokens.USDBC,
                    //     pool: NO ACTIVE POOL
                    // },
                ],
                uniswapV3: [
                    // {
                    //     token: BASE.tokens.USDC,
                    //     pool: NO ACTIVE POOL (v2 has the most liquidity 0x88A43bbDF9D098eEC7bCEda4e2494615dfD9bB9C) TODO: V4 has pool (0x64f978ef116d3c2e1231cfd8b80a369dcd8e91b28037c9973b65b59fd2cbbb96 USDC / cbBTC 0.3%)
                    // },
                    // {
                    //     token: BASE.tokens.WBTC,
                    //     pool: NO ACTIVE POOL (v4 LOW LIQUIDITY)
                    // },
                    // {
                    //     token: BASE.tokens.wstETH,
                    //     pool: NO ACTIVE POOL TODO: V4 has pool (0x64f978ef116d3c2e1231cfd8b80a369dcd8e91b28037c9973b65b59fd2cbbb96 cbBTC / USDC 0.3%)
                    // },
                    // {
                    //     token: BASE.tokens.cbETH,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: BASE.tokens.WETH,
                    //     pool: NO ACTIVE POOL (v2 has the most liquidity 0x88A43bbDF9D098eEC7bCEda4e2494615dfD9bB9C) TODO: V4 has pool (0x96d4b53a38337a5733179751781178a2613306063c511b78cd02684739288c0a WETH / USDC 0.3%)
                    // }
                    // {
                    //     token: BASE.tokens.sUSDS,
                    //     pool: NO ACTIVE POOL (v4 LOW LIQUIDITY)
                    // },
                    // {
                    //     token: BASE.tokens.AERO,
                    //     pool: NO ACTIVE POOL TODO: V4 has pool (0x56a0cd87d81cc71184a4b2dd42964591bf351d0cfdded03f9bc75b7b559344ce USDC / AERO 1% (under 200k))
                    // },
                    // {
                    //     token: BASE.tokens.USDBC,
                    //     pool: NO ACTIVE POOL TODO: V4 has pool (0xa0ab20a64f46b5676fe1542cb87b454e5104007689e0eef4212aa0cbe34933a1 USDC / USDBC 0.001%)
                    // }
                ],
                aave: BASE.protocols.aave,
                balancer: BASE.protocols.balancer,
                uniswapV4: BASE.protocols.uniswapV4
            },
            swapPlugins: {
                lifi: BASE.protocols.lifi
            }
        }
    },

    polygon: {
        treasury: POLYGON.treasury,
        weth: POLYGON.tokens.WETH,
        plugins: {
            loanPlugins: {
                morpho: POLYGON.protocols.morpho,
                uniswapV3: [
                    { token: POLYGON.tokens.USDC, pool: POLYGON.pools.uniswapV3.USDC }, // USDC / USDC.e 0.01%
                    { token: POLYGON.tokens.WBTC, pool: POLYGON.pools.uniswapV3.WBTC }, // WBTC / WETH 0.05%
                    { token: POLYGON.tokens.WMATIC, pool: POLYGON.pools.uniswapV3.WMATIC }, // WMATIC (WPOL)
                    { token: POLYGON.tokens.WETH, pool: POLYGON.pools.uniswapV3.WETH } // WETH / USDCT 0.3%
                    // {
                    //     token: POLYGON.tokens.MATICx
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: POLYGON.tokens.stMATIC
                    //     pool: LOW LIQUIDITY
                    // }
                ],
                aave: POLYGON.protocols.aave,
                balancer: POLYGON.protocols.balancer,
                uniswapV4: POLYGON.protocols.uniswapV4
            },
            swapPlugins: {
                lifi: POLYGON.protocols.lifi
            }
        }
    },

    optimism: {
        treasury: OPTIMISM.treasury,
        weth: OPTIMISM.tokens.WETH,
        plugins: {
            loanPlugins: {
                morpho: OPTIMISM.protocols.morpho,
                uniswapV3: [
                    { token: OPTIMISM.tokens.USDC, pool: OPTIMISM.pools.uniswapV3.USDC }, // USDC / WETH 0.3%
                    { token: OPTIMISM.tokens.USDT, pool: OPTIMISM.pools.uniswapV3.USDT }, // USDT / WETH 0.05%
                    { token: OPTIMISM.tokens.OP, pool: OPTIMISM.pools.uniswapV3.OP }, // OP / WETH 0.3%
                    { token: OPTIMISM.tokens.WBTC, pool: OPTIMISM.pools.uniswapV3.WBTC }, // WBTC / WETH 0.3%
                    { token: OPTIMISM.tokens.wstETH, pool: OPTIMISM.pools.uniswapV3.wstETH }, // WSTETH / WETH 0.01% (under 50k)
                    { token: OPTIMISM.tokens.rETH, pool: OPTIMISM.pools.uniswapV3.rETH } // RETH / WETH 0.05% (under 50K)
                    // {
                    //     token: OPTIMISM.tokens.weETH,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: OPTIMISM.tokens.weETH,
                    //     pool: LOW LIQUIDITY
                    // },
                    // {
                    //     token: OPTIMISM.tokens.wrsETH,
                    //     pool: LOW LIQUIDITY
                    // }
                ],
                aave: OPTIMISM.protocols.aave,
                balancer: OPTIMISM.protocols.balancer,
                uniswapV4: OPTIMISM.protocols.uniswapV4
            },
            swapPlugins: {
                lifi: OPTIMISM.protocols.lifi
            }
        }
    }
};

export function validateConfig(config: DeployConfig): void {
    if (!config.weth) throw new Error("WETH address is required");
    if (!config.treasury) throw new Error("Treasury address is required");
    if (!config.plugins.swapPlugins.lifi) throw new Error("LiFi router address is required");
    console.log("Configuration validated successfully");
}
