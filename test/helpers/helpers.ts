import axios from "axios";
import { Addressable } from "ethers";
import { ethers } from "hardhat";

export const ZERO_ADDRESS = ethers.ZeroAddress;

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

export function exp(value: number | bigint, decimals: number | bigint = 0, precision: number | bigint = 6): bigint {
    const val = typeof value === "bigint" ? Number(value) : value;
    const dec = typeof decimals === "bigint" ? Number(decimals) : decimals;
    const prec = typeof precision === "bigint" ? Number(precision) : precision;

    return (BigInt(Math.floor(val * 10 ** prec)) * 10n ** BigInt(dec)) / 10n ** BigInt(prec);
}
