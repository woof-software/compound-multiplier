import axios from "axios";

import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { Addressable, Signer } from "ethers";
import { ethers } from "hardhat";
import { CometMultiplier, IComet, IERC20 } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { $CometCollateralSwap } from "../../typechain-types/contracts-exposed/CometCollateralSwap.sol/$CometCollateralSwap";
export { SnapshotRestorer, takeSnapshot, time } from "@nomicfoundation/hardhat-network-helpers";

export interface Plugin {
    endpoint: string;
    config: string;
}

export { ethers };

export const ZERO_ADDRESS = ethers.ZeroAddress;
export const FACTOR_SCALE = exp(1, 18);
export const PRECISION = 10_000n;

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

// Adapter constants
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
export const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
export const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";
export const MORPHO = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
export const UNI_V3_USDC_WETH_005 = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
export const LIFI_ROUTER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";

export async function executeWithRetry(operation: Function, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
}

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
        aavePlugin: { endpoint: await ethers.deployContract("AAVEPlugin", []), config: "0x" },
        balancerPlugin: { endpoint: await ethers.deployContract("BalancerPlugin", []), config: "0x" }
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

export async function deployCollateralSwap(flashLoanPlugins: Plugin[]): Promise<$CometCollateralSwap> {
    return (await ethers.deployContract("$CometCollateralSwap", [flashLoanPlugins])) as unknown as $CometCollateralSwap;
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

    return (amountTo * (PRECISION - slippage)) / PRECISION;
}

export async function getLiquidity(comet: IComet, token: IERC20, amount: bigint): Promise<bigint> {
    const assetInfo = await comet.getAssetInfoByAddress(token);
    const priceUSD = (amount * (await comet.getPrice(assetInfo.priceFeed))) / assetInfo.scale;
    return (priceUSD * assetInfo.borrowCollateralFactor) / FACTOR_SCALE;
}

/*//////////////////////////////////////////////////////////////
                                API DATA
//////////////////////////////////////////////////////////////*/

export async function get1inchSwapData(
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string,
    slippage: string = "1"
): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const apiKey = process.env.ONE_INCH_API_KEY;
    const url = `https://api.1inch.dev/swap/v6.1/1/swap?src=${fromToken}&dst=${toToken}&amount=${amount}&from=${userAddress}&slippage=${slippage}&disableEstimate=true&includeTokensInfo=true`;
    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
    });

    return res.data.tx.data;
}

export async function get1inchQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: string = "1"
): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const apiKey = process.env.ONE_INCH_API_KEY;
    const url = `https://api.1inch.dev/swap/v6.1/1/quote?src=${fromToken}&dst=${toToken}&amount=${amount}&slippage=${slippage}`;
    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
    });
    return res.data.dstAmount;
}

export async function getQuote(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    fromAddress: string | Addressable
) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const quoteData = (
        await axios.get("https://li.quest/v1/quote", {
            headers: { "x-lifi-api-key": process.env.LIFI_API_KEY },
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

///////////////////////////////////////////////////////////////
//                               ADAPTER
///////////////////////////////////////////////////////////////
export async function previewTake(
    comet: IComet,
    user: string,
    collateral: string,
    requestedCollateral: bigint,
    blockTag?: number
): Promise<bigint> {
    const tag = blockTag ?? (await ethers.provider.getBlockNumber());

    const [info, baseScale, userCol, repayAmount] = await Promise.all([
        comet.getAssetInfoByAddress(collateral, { blockTag: tag }),
        comet.baseScale({ blockTag: tag }),
        comet.collateralBalanceOf(user, collateral, { blockTag: tag }),
        comet.borrowBalanceOf(user, { blockTag: tag })
    ]);

    const price = await comet.getPrice(info.priceFeed, { blockTag: tag });
    const priceFeed = await ethers.getContractAt("AggregatorV3Interface", info.priceFeed);
    const decs = await priceFeed.decimals({ blockTag: tag });
    const num = BigInt(price) * BigInt(baseScale) * BigInt(info.borrowCollateralFactor);
    const den = 10n ** BigInt(decs) * BigInt(info.scale) * 10n ** 18n;

    const req = requestedCollateral;
    const debtFromRequested = req === ethers.MaxUint256 ? repayAmount : (req * num) / den;

    const loanDebt = debtFromRequested < repayAmount ? debtFromRequested : repayAmount;

    if (loanDebt === 0n) return 0n;

    let unlocked = (loanDebt * den) / num;

    const reqCap = req === ethers.MaxUint256 ? BigInt(userCol) : req < BigInt(userCol) ? req : BigInt(userCol);
    const take = unlocked < reqCap ? unlocked : reqCap;

    return take > 0n ? take : 0n;
}

export async function calculateLeveragedAmount(comet: IComet, collateralAmount: bigint, leverage: number) {
    const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
    const price = await comet.getPrice(info.priceFeed);
    const baseScale = await comet.baseScale();

    const initialValueBase = (collateralAmount * price * baseScale) / (info.scale * 100_000_000n);
    const delta = BigInt(leverage - 10_000);
    return (initialValueBase * delta) / 10_000n;
}

export async function calculateExpectedCollateral(collateralAmount: bigint, leverage: number): Promise<bigint> {
    const theoretical = (collateralAmount * BigInt(leverage)) / 10_000n;
    const borrowedPortion = theoretical - collateralAmount;
    const slippageAdjusted = (borrowedPortion * 99n) / 100n;
    return collateralAmount + slippageAdjusted;
}

export async function calculateMaxLeverage(comet: IComet): Promise<number> {
    const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
    const borrowCollateralFactor = Number(info.borrowCollateralFactor) / 1e18;
    const theoreticalMax = (1 / (1 - borrowCollateralFactor)) * 10_000;
    return Math.floor(theoreticalMax * 0.95);
}

export async function calculateMaxSafeWithdrawal(
    comet: IComet,
    userAddress: string,
    collateralAddress: string,
    targetHealthRatio: bigint = 110n
): Promise<bigint> {
    const info = await comet.getAssetInfoByAddress(collateralAddress);
    const price = await comet.getPrice(info.priceFeed);
    const baseScale = await comet.baseScale();

    const currentCol = await comet.collateralBalanceOf(userAddress, collateralAddress);
    const currentDebt = await comet.borrowBalanceOf(userAddress);

    if (currentDebt === 0n) return currentCol;

    const minCollateralValue = (currentDebt * targetHealthRatio) / 100n;
    const minCollateralAmount =
        (minCollateralValue * info.scale * 100_000_000n) / (price * baseScale * BigInt(info.borrowCollateralFactor));

    const maxWithdrawal = currentCol > minCollateralAmount ? currentCol - minCollateralAmount : 0n;

    return maxWithdrawal;
}

export async function executeMultiplier1Inch(
    weth: IERC20,
    market: any,
    comet: IComet,
    adapter: CometMultiplier,
    signer: SignerWithAddress,
    collateralAmount: bigint,
    leverage: number,
    minAmountOut = 1n
) {
    await weth.connect(signer).approve(await adapter.getAddress(), collateralAmount);

    const baseAmount = await calculateLeveragedAmount(comet, collateralAmount, leverage);

    return executeWithRetry(async () => {
        const swapData = await get1inchSwapData(
            USDC_ADDRESS,
            WETH_ADDRESS,
            baseAmount.toString(),
            await adapter.getAddress()
        );

        return adapter
            .connect(signer)
            .executeMultiplier(market, WETH_ADDRESS, collateralAmount, leverage, swapData, minAmountOut);
    });
}

export async function withdrawMultiplier1Inch(
    market: any,
    comet: IComet,
    adapter: CometMultiplier,
    signer: SignerWithAddress,
    requestedCollateral: bigint,
    minAmountOut?: bigint
) {
    const blockTag = await ethers.provider.getBlockNumber();
    let take = await previewTake(comet, signer.address, WETH_ADDRESS, requestedCollateral, blockTag);
    let quote = 0n;
    if (take > 0n) {
        quote =
            minAmountOut ??
            (await executeWithRetry(async () => {
                const q = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, take.toString());
                return (BigInt(q) * 99n) / 100n;
            }));
    }

    return await executeWithRetry(async () => {
        const swapData =
            take == 0n
                ? "0x"
                : await get1inchSwapData(WETH_ADDRESS, USDC_ADDRESS, take.toString(), await adapter.getAddress());

        return adapter.connect(signer).withdrawMultiplier(market, WETH_ADDRESS, requestedCollateral, swapData, quote);
    });
}

export async function executeMultiplierLiFi(
    weth: IERC20,
    market: any,
    comet: IComet,
    adapter: CometMultiplier,
    signer: SignerWithAddress,
    collateralAmount: bigint,
    leverage: number,
    minAmountOut = 1n
) {
    await weth.connect(signer).approve(await adapter.getAddress(), collateralAmount);

    const baseAmount = await calculateLeveragedAmount(comet, collateralAmount, leverage);

    return await executeWithRetry(async () => {
        const swapData = await getQuote(
            "1",
            "1",
            USDC_ADDRESS,
            WETH_ADDRESS,
            baseAmount.toString(),
            await adapter.getAddress()
        ).then((q) => q.swapCalldata);

        return adapter
            .connect(signer)
            .executeMultiplier(market, WETH_ADDRESS, collateralAmount, leverage, swapData, minAmountOut);
    });
}

export async function withdrawMultiplierLiFi(
    market: any,
    comet: IComet,
    adapter: CometMultiplier,
    signer: SignerWithAddress,
    requestedCollateral: bigint,
    minAmountOut?: bigint
) {
    const blockTag = await ethers.provider.getBlockNumber();
    let take = await previewTake(comet, signer.address, WETH_ADDRESS, requestedCollateral, blockTag);
    let quote = 0n;
    if (take > 0n) {
        quote =
            minAmountOut ??
            (await executeWithRetry(async () => {
                const q = await getQuote(
                    "1",
                    "1",
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    take.toString(),
                    await adapter.getAddress()
                ).then((q) => q.toAmountMin);
                return (BigInt(q) * 99n) / 100n;
            }));
    }

    return await executeWithRetry(async () => {
        const swapData =
            take == 0n
                ? "0x"
                : await getQuote(
                      "1",
                      "1",
                      WETH_ADDRESS,
                      USDC_ADDRESS,
                      take.toString(),
                      await adapter.getAddress()
                  ).then((q) => q.swapCalldata);

        return adapter.connect(signer).withdrawMultiplier(market, WETH_ADDRESS, requestedCollateral, swapData, quote);
    });
}

export async function calculateHealthFactor(
    comet: IComet,
    userAddress: string,
    collateralAddress: string
): Promise<bigint> {
    const info = await comet.getAssetInfoByAddress(collateralAddress);
    const price = await comet.getPrice(info.priceFeed);
    const baseScale = await comet.baseScale();
    const collateralBalance = await comet.collateralBalanceOf(userAddress, collateralAddress);
    const borrowBalance = await comet.borrowBalanceOf(userAddress);

    const collateralValue = (collateralBalance * price * baseScale) / (info.scale * 100_000_000n);
    const healthRatio = (collateralValue * BigInt(info.borrowCollateralFactor)) / ethers.parseEther("1");

    return healthRatio;
}

/**
 * Gets the current nonce for a user from the Comet contract
 */
export async function getUserNonce(comet: any, userAddress: string): Promise<bigint> {
    return await comet.userNonce(userAddress);
}

/**
 * Generates an EIP-712 signature for allowBySig
 */
/**
 * Generates an EIP-712 signature for allowBySig using TypedData signing
 */
export async function signAllowBySig(
    signer: SignerWithAddress,
    cometAddress: string,
    managerAddress: string,
    isAllowed: boolean,
    nonce: bigint,
    expiry: bigint,
    chainId: number
): Promise<{ v: number; r: string; s: string }> {
    // Get Comet contract name and version
    const comet = await ethers.getContractAt("ICometExt", cometAddress);
    const name = await comet.name();
    const version = await comet.version();

    // EIP-712 Domain
    const domain = {
        name: name,
        version: version,
        chainId: chainId,
        verifyingContract: cometAddress
    };

    // EIP-712 Types
    const types = {
        Authorization: [
            { name: "owner", type: "address" },
            { name: "manager", type: "address" },
            { name: "isAllowed", type: "bool" },
            { name: "nonce", type: "uint256" },
            { name: "expiry", type: "uint256" }
        ]
    };

    // Message data
    const value = {
        owner: signer.address,
        manager: managerAddress,
        isAllowed: isAllowed,
        nonce: nonce,
        expiry: expiry
    };

    // Sign using EIP-712 typed data (this is the correct way)
    const signature = await signer.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    return {
        v: sig.v,
        r: sig.r,
        s: sig.s
    };
}

/**
 * Executes allowBySig on the Comet contract
 */
export async function executeAllowBySig(
    comet: any,
    owner: string,
    manager: string,
    isAllowed: boolean,
    nonce: bigint,
    expiry: bigint,
    v: number,
    r: string,
    s: string,
    opts?: any
): Promise<any> {
    return await comet.allowBySig(owner, manager, isAllowed, nonce, expiry, v, r, s, opts || {});
}

/**
 * Helper to get a future expiry timestamp (default 1 hour from now)
 */
export function getFutureExpiry(secondsFromNow: number = 3600): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow);
}

/**
 * Combined helper: sign and execute allowBySig in one call
 */
export async function allowBySigHelper(
    comet: any,
    signer: SignerWithAddress,
    managerAddress: string,
    isAllowed: boolean,
    opts?: any
): Promise<any> {
    const cometAddress = await comet.getAddress();
    const nonce = await getUserNonce(comet, signer.address);
    const expiry = getFutureExpiry();
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const { v, r, s } = await signAllowBySig(
        signer,
        cometAddress,
        managerAddress,
        isAllowed,
        nonce,
        expiry,
        Number(chainId)
    );

    return await executeAllowBySig(comet, signer.address, managerAddress, isAllowed, nonce, expiry, v, r, s, opts);
}
