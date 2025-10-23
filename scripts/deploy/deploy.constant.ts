export enum Network {
    Mainnet,
    Base,
    Polygon,
    Optimism,
    Linea,
    Arbitrum,
    Unichain
}

const constants: Map<Network, Constant> = new Map();

interface Constant {
    treasury: string;
    tokens: { [key: string]: string };
    protocols: { [key: string]: string };
    pools: { [key: string]: { [key: string]: string } };
}

// Mainnet addresses
constants.set(Network.Mainnet, {
    treasury: "0xYourTreasuryAddressHere",
    tokens: {
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        WBTC: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        COMP: "0xc00e94cb662c3520282e6f5717214004a7f26888",
        UNI: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
        LINK: "0x514910771af9ca656af840dff83e8264ecf986ca",
        wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
        weETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        tBTC: "0x18084fbA666a33d37592fA2633fD49a74DD93a88",
        cbBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
        USDe: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3",
        LBTC: "0x8236a87084f8B84306f72007F36F2618A5634494",
        USDS: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
        pumpBTC: "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e",
        rsETH: "0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7",
        ezETH: "0xbf5495Efe5DB9ce00f80364C8B423567e58d2110",
        sUSDS: "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD",
        sFRAX: "0xA663B02CF0a4b149d2aD41910CB81e23e1c41c32",
        osETH: "0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38",
        ETHx: "0xA35b1B31Ce002FBF2058D22F30f95D405200A15b",
        rswETH: "0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0"
    },
    protocols: {
        morpho: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
        aave: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
        balancer: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
    },
    pools: {
        euler: {
            USDC: "0x9bD52F2805c6aF014132874124686e7b248c2Cbb",
            USDT: "0x7c280DBDEf569e96c7919251bD2B0edF0734C5A8",
            WETH: "0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2",
            WBTC: "0x998D761eC1BAdaCeb064624cc3A1d37A46C88bA4",
            wstETH: "0xbC4B4AC47582c3E38Ce5940B80Da65401F4628f1",
            weETH: "0xe846ca062aB869b66aE8DcD811973f628BA82eAf",
            cbBTC: "0x056f3a2E41d2778D3a0c0714439c53af2987718E",
            USDe: "0x2daCa71Cb58285212Dc05D65Cfd4f59A82BC4cF6",
            LBTC: "0xbC35161043EE2D74816d421EfD6a45fDa73B050A",
            USDS: "0x1E2f2E2e3c7E3b8b8E4D7Ff2e3C4b5A6D7E8F9A0",
            rsETH: "0x1924D7fab80d0623f0836Cbf5258a7fa734EE9D9",
            ezETH: "0xE88e44C2C7dfc9bcb86e380d29375ccD6cd85406"
        },
        uniswapV3: {
            USDC: "0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35", // USDC / WBTC 0.3%
            USDT: "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // USDT / WETH 0.3%
            WETH: "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // WETH / USDT 0.3%
            COMP: "0xCFfDdeD873554F362Ac02f8Fb1f02E5ada10516f", // COMP / WETH 0.3%
            WBTC: "0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35", // WBTC / USDC 0.3%
            UNI: "0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801", // UNI / WETH 0.3%
            LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK / WETH 0.3%
            wstETH: "0x109830a1AAaD605BbF02a9dFA7B0B92EC2FB7dAa", // WSTETH / ETH 0.01%
            weETH: "0x202A6012894Ae5c288eA824cbc8A9bfb26A49b93", // WEETH / ETH 0.01%
            tBTC: "0x73A38006d23517a1d383C88929B2014F8835B38B", // TBTC / WBTC 0.01%
            cbBTC: "0xe8f7c89C5eFa061e340f2d2F206EC78FD8f7e124", // cbBTC / WBTC 0.01%
            USDe: "0xE6D7EbB9f1a9519dc06D557e03C522d53520e76A", // USDe / USDC 0.01%
            LBTC: "0x87428a53e14d24Ab19c6Ca4939B4df93B8996cA9", // LBTC / WBTC 0.05%
            USDS: "0xe9F1E2EF814f5686C30ce6fb7103d0F780836C67", // USDS / DAI 0.3%
            SUSDS: "0x735cDC75FB1f24F53BB8Ffa4e7eB2d795005210f" // sUSDS / USDT 0.05%
        }
    }
});

// Base addresses
constants.set(Network.Base, {
    treasury: "0xYourBaseTreasuryAddressHere",
    tokens: {
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        wstETH: "0xc1CbA3fCea344f92D9239c08C0568f6F2F0ee452",
        cbBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
        cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
        WETH: "0x4200000000000000000000000000000000000006",
        sUSDS: "0x5875eEE11Cf8398102FdAd704C9E96607675467a",
        AERO: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
        USDBC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"
    },
    protocols: {
        morpho: "0x8b5EB720849ae8e7091230bab4E6cf2f8A45bD19",
        aave: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        balancer: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
    },
    pools: {
        euler: {
            USDC: "0x1F04C03d030e22ac57B6C44FB72A4F2Ad5d6c1d3",
            wstETH: "0x7b181d6509DEabfbd1A23aF1E65fD46E89572609",
            cbBTC: "0x882018411Bc4A020A879CEE183441fC9fa5D7f8B",
            cbETH: "0x358f25F82644eaBb441d0df4AF8746614fb9ea49",
            WETH: "0x859160DB5841E5cfB8D3f144C6b3381A85A4b410",
            sUSDS: "0x556d518FDFDCC4027A3A1388699c5E11AC201D8b",
            AERO: "0x5Fe2DE3E565a6a501a4Ec44AAB8664b1D674ac25"
        }
    }
});

// Polygon addresses
constants.set(Network.Polygon, {
    treasury: "0xYourPolygonTreasuryAddressHere",
    tokens: {
        WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        WBTC: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
        WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        MATICx: "0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6",
        stMATIC: "0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4"
    },
    protocols: {
        morpho: "0x1bF0c2541F820E775182832f06c0B7Fc27A25f67",
        aave: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",
        balancer: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
    },
    pools: {
        uniswapV3: {
            USDC: "0xD36ec33c8bed5a9F7B6630855f1533455b98a418", // USDC / USDC.e 0.01%
            WBTC: "0x50eaEDB835021E4A108B7290636d62E9765cc6d7", // WBTC / WETH 0.05%
            WMATIC: "0x9B08288C3Be4F62bbf8d1C20Ac9C5e6f9467d8B7",
            WETH: "0x4CcD010148379ea531D6C587CfDd60180196F9b1", // WETH / USDT 0.3%
            USDT: "0x4CcD010148379ea531D6C587CfDd60180196F9b1" // USDT / WETH 0.3%
        }
    }
});

// Optimism addresses
constants.set(Network.Optimism, {
    treasury: "0xYourOptimismTreasuryAddressHere",
    tokens: {
        WETH: "0x4200000000000000000000000000000000000006",
        USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        OP: "0x4200000000000000000000000000000000000042",
        WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
        wstETH: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
        rETH: "0x9Bcef72be871e61ED4fBbc7630889beE758eb81D",
        wrsETH: "0x87eEE96D50Fb761AD85B1c982d28A042169d61b1",
        weETH: "0x5A7fACB970D094B6C7FF1df0eA68D99E6e73CBFF"
    },
    protocols: {
        morpho: "0xce95AfbB8EA029495c66020883F87aaE8864AF92",
        aave: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        balancer: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
    },
    pools: {
        uniswapV3: {
            USDC: "0xc1738D90E2E26C35784A0d3E3d8A9f795074bcA4", // USDC / WETH 0.3%
            USDT: "0xc858A329Bf053BE78D6239C4A4343B8FbD21472b", // USDT / WETH 0.05%
            OP: "0x68F5C0A2DE713a54991E01858Fd27a3832401849", // OP / WETH 0.3%
            WBTC: "0x73B14a78a0D396C521f954532d43fd5fFe385216", // WBTC / WETH 0.3%
            wstETH: "0x04F6C85A1B00F6D9B75f91FD23835974Cc07E65c", // WSTETH / WETH 0.01%
            rETH: "0xAEfC1edaeDE6ADaDcdF3bB344577D45A80B19582" // RETH / WETH 0.05%
        }
    }
});

// Linea addresses
constants.set(Network.Linea, {
    treasury: "0xYourLineaTreasuryAddressHere",
    tokens: {
        WETH: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
        USDC: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
        WBTC: "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4",
        wstETH: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
        ezETH: "0x2416092f143378750bb29b79eD961ab195CcEea5",
        weETH: "0x1Bf74C010E6320bab11e2e5A532b5AC15e0b8aA6",
        wrsETH: "0xD2671165570f41BBB3B0097893300b6EB6101E6C"
    },
    protocols: {
        aave: "0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac",
        lifi: "0xde1e598b81620773454588b85d6b5d4eec32573e"
    },
    pools: {
        euler: {
            wstETH: "0x359e363c11fC619BE76EEC8BaAa01e61D521aA18",
            ezETH: "0x9947f3D2aE676bE4612Eb4d80e94f6441E47A2a9",
            weETH: "0x92Ba0dED54184ab00f7EdD1bc5Eba488cC8d9dE0",
            wrsETH: "0xb747b627C3b67cDC0Aeaf78FD7174aE5E5Bfa796",
            USDC: "0xfB6448B96637d90FcF2E4Ad2c622A487d0496e6f",
            WETH: "0xa8A02E6a894a490D04B6cd480857A19477854968"
        }
    }
});

// Arbitrum addresses
constants.set(Network.Arbitrum, {
    treasury: "0xYourArbitrumTreasuryAddressHere",
    tokens: {
        WETH: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        USDCe: "0xFF970A61A04b1cA14834A43f5de4533eBDDB5CC8",
        USDT: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        WBTC: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
        ARB: "0x912ce59144191c1204e64559fe8253a0e49e6548",
        GMX: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
        wstETH: "0x5979D7b546E38E414F7E9822514be443A4800529",
        weETH: "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe",
        rETH: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8"
    },
    protocols: {
        morpho: "0x6c247b1F6182318877311737BaC0844bAa518F5e",
        aave: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        balancer: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        lifi: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
    },
    pools: {
        euler: {
            USDC: "0x6aFB8d3F6D4A34e9cB2f217317f4dc8e05Aa673b",
            WETH: "0x6aFB8d3F6D4A34e9cB2f217317f4dc8e05Aa673b",
            WBTC: "0x6aFB8d3F6D4A34e9cB2f217317f4dc8e05Aa673b",
            wstETH: "0x6aFB8d3F6D4A34e9cB2f217317f4dc8e05Aa673b"
        },
        uniswapV3: {
            USDC: "0xC6962004f452bE9203591991D15f6b388e09E8D0", // USDC / WETH 0.05%
            USDCe: "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443", // USDC.e / WETH 0.05%
            USDT: "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // USDT / WETH 0.3%
            ARB: "0xC6F780497A95e246EB9449f5e4770916DCd6396A", // ARB / ETH 0.05%
            GMX: "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E", // GMX / ETH 1%
            WETH: "0xC6962004f452bE9203591991D15f6b388e09E8D0", // WETH / USDC 0.05%
            WBTC: "0x2f5e87C9312fa29aed5c179E456625D79015299c", // WBTC / USDC 0.3%
            wstETH: "0x35218a1cbaC5Bbc3E57fd9Bd38219D37571b3537", // WSTETH / ETH 0.01%
            weETH: "0x14353445c8329df76e6f15e9ead18fa2d45a8bb6", // WEETH / ETH 0.01%
            rETH: "0x09ba302A3f5ad2bF8853266e271b005A5b3716fe" // RETH / ETH 0.05%
        }
    }
});

// Unichain addresses
constants.set(Network.Unichain, {
    treasury: "0xYourUnichainTreasuryAddressHere",
    tokens: {
        WETH: "0x4200000000000000000000000000000000000006",
        USDC: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
        UNI: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
        WBTC: "0x927B51f251480a681271180DA4de28D44EC4AfB8",
        wstETH: "0xc02fE7317D4eb8753a02c35fe019786854A92001",
        weETH: "0x7DCC39B4d1C53CB31e1aBc0e358b43987FEF80f7",
        ezETH: "0x2416092f143378750bb29b79eD961ab195CcEea5"
    },
    protocols: {
        morpho: "0x8f5ae9cddb9f68de460c77730b018ae7e04a140a",
        lifi: "0x864b314D4C5a0399368609581d3E8933a63b9232"
    },
    pools: {
        euler: {
            wstETH: "0x54ff502df96CD9B9585094EaCd86AAfCe902d06A",
            weETH: "0xe36DA4Ea4D07E54B1029eF26A896A656A3729f86",
            ezETH: "0x45b41B20B11cD2e71A6BF3021bdbc3F8aFEa5538",
            WBTC: "0x5d2511C1EBc795F4394f7f659f693f8C15796485",
            USDC: "0x6eAe95ee783e4D862867C4e0E4c3f4B95AA682Ba",
            WETH: "0x1f3134C3f3f8AdD904B9635acBeFC0eA0D0E1ffC"
        },
        uniswapV3: {
            UNI: "0xC24f7d8E51A64dc1238880BD00bb961D54cbeb29",
            weETH: "0x1b01fba73ff847e3d96162a8bcd5426f6cde56a6", // WEETH / WETH 0.01%
            WBTC: "0x1D6ae37DB0e36305019fB3d4bad2750B8784aDF9", // WBTC / WETH 1%
            USDC: "0x8927058918e3CFf6F55EfE45A58db1be1F069E49", // USDC / WETH 0.3%
            WETH: "0x8927058918e3CFf6F55EfE45A58db1be1F069E49" // WETH / USDC 0.3%
        }
    }
});

export function envs(network: Network) {
    return constants.get(network);
}
