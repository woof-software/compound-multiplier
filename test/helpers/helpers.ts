import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import axios from "axios";
import { Addressable } from "ethers";
import { ethers } from "hardhat";
import { $CompoundV3CollateralSwap } from "../../typechain-types/contracts-exposed/CompoundV3CollateralSwap.sol/$CompoundV3CollateralSwap";
import { IComet, IERC20 } from "../../typechain-types";
export { SnapshotRestorer, takeSnapshot, time } from "@nomicfoundation/hardhat-network-helpers";

export interface Plugin {
    endpoint: string;
    flp: string;
}

export { ethers };

export const ZERO_ADDRESS = ethers.ZeroAddress;
export const FACTOR_SCALE = exp(1, 18);
export const BPS_DROP_DENOMINATOR = 10_000n;

// Mainnet data
export const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
export const BALANCER_VAULT = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
export const SWAP_ROUTER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";
export const COMET = "0xA17581A9E3356d9A858b789D68B4d866e593aE94";

// Mainnet Tokens
export const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const WST_ETH = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
export const RS_ETH = "0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7";
export const R_ETH = "0xae78736Cd615f374D3085123A210448E74Fc6393";
export const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";

// Mainnet Whales
export const USDC_WHALE = "0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055";
export const WETH_WHALE = "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8";
export const WST_ETH_WHALE = "0x0B925eD163218f6662a35e0f0371Ac234f9E9371";
export const RS_ETH_WHALE = "0x2D62109243b87C4bA3EE7bA1D91B0dD0A074d7b1";
export const R_ETH_WHALE = "0xCc9EE9483f662091a1de4795249E24aC0aC2630f";
export const WBTC_WHALE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";

export async function getWhales() {
    const whales = [USDC_WHALE, WETH_WHALE, WST_ETH_WHALE, RS_ETH_WHALE, R_ETH_WHALE, WBTC_WHALE];
    for (const whale of whales) {
        await impersonateAccount(whale);
        await setBalance(whale, exp(1000, 18));
    }

    return {
        usdcWhale: await ethers.getSigner(USDC_WHALE),
        wethWhale: await ethers.getSigner(WETH_WHALE),
        wstETHWhale: await ethers.getSigner(WST_ETH_WHALE),
        rsETHWhale: await ethers.getSigner(RS_ETH_WHALE),
        rETHWhale: await ethers.getSigner(R_ETH_WHALE),
        wbtcWhale: await ethers.getSigner(WBTC_WHALE)
    };
}

export async function tokensInstances() {
    return {
        usdc: await ethers.getContractAt("IERC20", USDC),
        weth: await ethers.getContractAt("IERC20", WETH),
        wstETH: await ethers.getContractAt("IERC20", WST_ETH),
        rsETH: await ethers.getContractAt("IERC20", RS_ETH),
        rETH: await ethers.getContractAt("IERC20", R_ETH),
        wbtc: await ethers.getContractAt("IERC20", WBTC)
    };
}

export async function getPlugins() {
    return {
        aavePlugin: { endpoint: await ethers.deployContract("AAVEPlugin", []), flp: AAVE_POOL },
        balancerPlugin: { endpoint: await ethers.deployContract("BalancerPlugin", []), flp: BALANCER_VAULT }
    };
}

export async function getComet() {
    return await ethers.getContractAt("IComet", COMET);
}

export async function getSwapPlugins() {
    return {
        lifiPlugin: { endpoint: await ethers.deployContract("LiFiPlugin", []), router: SWAP_ROUTER }
    };
}

export async function deployCollateralSwap(
    flashLoanPlugins: Plugin[],
    swapRouter: string,
    swapPlugin: string | Addressable
): Promise<$CompoundV3CollateralSwap> {
    return (await ethers.deployContract("$CompoundV3CollateralSwap", [
        flashLoanPlugins,
        swapRouter,
        swapPlugin
    ])) as unknown as $CompoundV3CollateralSwap;
}

export async function calcMinAmountOut(
    cometAddress: string | Addressable,
    assetFrom: string | Addressable,
    assetTo: string | Addressable,
    fromAmount: bigint,
    slippage: bigint
): Promise<bigint> {
    const comet = await ethers.getContractAt("IComet", cometAddress);

    const assetFromInfo = await comet.getAssetInfoByAddress(assetFrom);
    const assetToInfo = await comet.getAssetInfoByAddress(assetTo);

    const priceFrom = await comet.getPrice(assetFromInfo.priceFeed);
    const priceTo = await comet.getPrice(assetToInfo.priceFeed);

    const assetFromLiquidity =
        (((fromAmount * priceFrom) / assetFromInfo.scale) * assetFromInfo.borrowCollateralFactor) / FACTOR_SCALE;

    const amountTo =
        (assetFromLiquidity * FACTOR_SCALE * assetToInfo.scale) / (priceTo * assetToInfo.borrowCollateralFactor);

    return (amountTo * (BPS_DROP_DENOMINATOR - slippage)) / BPS_DROP_DENOMINATOR;
}

export async function getLiquidity(comet: IComet, token: IERC20, amount: bigint): Promise<bigint> {
    const assetInfo = await comet.getAssetInfoByAddress(token);
    const priceUSD = (amount * (await comet.getPrice(assetInfo.priceFeed))) / assetInfo.scale;
    return (priceUSD * assetInfo.borrowCollateralFactor) / FACTOR_SCALE;
}

/*//////////////////////////////////////////////////////////////
                                API DATA
//////////////////////////////////////////////////////////////*/

export async function getQuote(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    fromAddress: string | Addressable
) {
    const quoteData = (
        await axios.get("https://li.quest/v1/quote", {
            params: {
                fromChain,
                toChain,
                fromToken,
                toToken,
                fromAmount,
                fromAddress
            }
        })
    ).data;

    return {
        toAmountMin: BigInt(quoteData.estimate.toAmountMin),
        toAmount: BigInt(quoteData.estimate.toAmount),
        swapCalldata: quoteData.transactionRequest.data
    };
}

/*//////////////////////////////////////////////////////////////
                                MATH
//////////////////////////////////////////////////////////////*/

export function exp(value: number | bigint, decimals: number | bigint = 0, precision: number | bigint = 6): bigint {
    const val = typeof value === "bigint" ? Number(value) : value;
    const dec = typeof decimals === "bigint" ? Number(decimals) : decimals;
    const prec = typeof precision === "bigint" ? Number(precision) : precision;

    return (BigInt(Math.floor(val * 10 ** prec)) * 10n ** BigInt(dec)) / 10n ** BigInt(prec);
}
