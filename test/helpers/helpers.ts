import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import axios from "axios";
import { Addressable } from "ethers";
import { ethers } from "hardhat";

export { ethers };

export const ZERO_ADDRESS = ethers.ZeroAddress;

// Mainnet data
export const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
export const BALANCER_VAULT = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

// Mainnet Tokens
export const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// Mainnet Whales
export const USDC_WHALE = "0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055";

export async function getWhales() {
    await impersonateAccount(USDC_WHALE);
    await setBalance(USDC_WHALE, exp(10000, 18));

    return {
        usdcWhale: await ethers.getSigner(USDC_WHALE)
    };
}

export async function tokensInstances() {
    return {
        usdc: await ethers.getContractAt("IERC20", USDC)
    };
}

export async function getPlugins() {
    return {
        aavePlugin: { endpoint: await ethers.deployContract("AAVEPlugin", []), flp: AAVE_POOL },
        balancerPlugin: { endpoint: await ethers.deployContract("BalancerPlugin", []), flp: BALANCER_VAULT }
    };
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
    return (
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
