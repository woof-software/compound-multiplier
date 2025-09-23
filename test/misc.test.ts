import { ethers } from "hardhat";
import { expect } from "chai";
import {
    CometMultiplierAdapter,
    EulerV2Plugin,
    OneInchV6SwapPlugin,
    IComet,
    IERC20,
    FakeFlashLoanPlugin
} from "../typechain-types";
import { get1inchQuote, get1inchSwapData } from "./utils/oneinch";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";
const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";
const USDC_WHALE = "0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055";

const opts = { maxFeePerGas: 4_000_000_000 };

describe("Comet Multiplier Adapter - Misc", function () {
    let adapter: CometMultiplierAdapter;
    let loanPlugin: FakeFlashLoanPlugin;
    let swapPlugin: OneInchV6SwapPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let initialSnapshot: any;

    async function executeWithRetry(operation: Function, maxRetries = 10) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
            }
        }
    }

    async function getMarketOptions(loanSelector?: string, swapSelector?: string) {
        return {
            market: COMET_USDC_MARKET,
            loanSelector: loanSelector ?? (await loanPlugin.CALLBACK_SELECTOR()),
            swapSelector: swapSelector ?? (await swapPlugin.CALLBACK_SELECTOR()),
            flp: USDC_EVAULT
        };
    }

    const U128 = (1n << 128n) - 1n;

    async function previewTake(
        comet: any,
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
        if (unlocked > U128) unlocked = U128;

        const reqCap = req === ethers.MaxUint256 ? BigInt(userCol) : req < BigInt(userCol) ? req : BigInt(userCol);
        const take = unlocked < reqCap ? unlocked : reqCap;

        return take > 0n ? take - 1n : 0n;
    }

    async function calculateLeveragedAmount(collateralAmount: bigint, leverage: number) {
        const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
        const price = await comet.getPrice(info.priceFeed);
        const baseScale = await comet.baseScale();

        const initialValueBase = (collateralAmount * price * baseScale) / (info.scale * 100_000_000n);
        const delta = BigInt(leverage - 10_000);
        return (initialValueBase * delta) / 10_000n;
    }

    async function executeMultiplier(
        signer: SignerWithAddress,
        collateralAmount: bigint,
        leverage: number,
        minAmountOut = 1n
    ) {
        await weth.connect(signer).approve(await adapter.getAddress(), collateralAmount);

        const baseAmount = await calculateLeveragedAmount(collateralAmount, leverage);
        const market = await getMarketOptions();

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

    async function withdrawMultiplier(signer: SignerWithAddress, requestedCollateral: bigint, minAmountOut?: bigint) {
        const market = await getMarketOptions();
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

        return executeWithRetry(async () => {
            const swapData =
                take == 0n
                    ? "0x"
                    : await get1inchSwapData(WETH_ADDRESS, USDC_ADDRESS, take.toString(), await adapter.getAddress());

            return adapter
                .connect(signer)
                .withdrawMultiplier(market, WETH_ADDRESS, requestedCollateral, swapData, quote);
        });
    }

    before(async function () {
        await ethers.provider.send("hardhat_reset", [
            {
                forking: { jsonRpcUrl: process.env.FORKING_URL! }
            }
        ]);

        [owner, user, user2] = await ethers.getSigners();

        const LoanFactory = await ethers.getContractFactory("FakeFlashLoanPlugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);

        const SwapFactory = await ethers.getContractFactory("OneInchV6SwapPlugin", owner);
        swapPlugin = await SwapFactory.deploy(opts);

        const plugins = [
            {
                endpoint: await loanPlugin.getAddress(),
                config: "0x"
            },
            {
                endpoint: await swapPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6])
            }
        ];

        const Adapter = await ethers.getContractFactory("CometMultiplierAdapter", owner);
        adapter = await Adapter.deploy(plugins, opts);

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
        const whale2 = await ethers.getImpersonatedSigner(USDC_WHALE);
        await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);
        await ethers.provider.send("hardhat_setBalance", [whale2.address, "0xffffffffffffffffffffff"]);
        await weth.connect(whale).transfer(user.address, ethers.parseEther("10"), opts);
        await weth.connect(whale).transfer(user2.address, ethers.parseEther("10"), opts);
        await usdc.connect(whale2).transfer(user.address, ethers.parseEther("0.0000001"), opts);

        const allowAbi = ["function allow(address, bool)"];
        const cometAsUser = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user);
        const cometAsUser2 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user2);
        await cometAsUser.allow(await adapter.getAddress(), true);
        await cometAsUser2.allow(await adapter.getAddress(), true);

        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    beforeEach(async function () {
        await ethers.provider.send("evm_revert", [initialSnapshot]);
        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    describe("Fallback", function () {
        it("Should revert on unknown function", async function () {
            const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [123]);
            await expect(owner.sendTransaction({ to: await adapter.getAddress(), data })).to.be.revertedWithCustomError(
                adapter,
                "UnknownCallbackSelector"
            );
        });
    });

    describe("Execute Multiplier", function () {
        it("Should revert if wrong loan plugin selector", async function () {
            const market = await getMarketOptions("0x00000001");

            await weth.connect(user).approve(await adapter.getAddress(), ethers.parseEther("1"));

            await expect(
                adapter.connect(user).executeMultiplier(market, WETH_ADDRESS, ethers.parseEther("1"), 20000, "0x", 1n)
            ).to.be.revertedWithCustomError(adapter, "InvalidPluginSelector");
        });

        it("Should revert if wrong swap plugin selector", async function () {
            const market = await getMarketOptions(undefined, "0x00000001");

            await weth.connect(user).approve(await adapter.getAddress(), ethers.parseEther("1"));
            await usdc.connect(user).approve(await adapter.getAddress(), ethers.parseEther("0.0000001"));

            await expect(
                adapter.connect(user).executeMultiplier(market, WETH_ADDRESS, ethers.parseEther("1"), 20000, "0x", 1n)
            ).to.be.revertedWithCustomError(adapter, "InvalidPluginSelector");
        });

        it("Should revert if amount out is less the debt amount returned by loan plugin", async function () {
            const market = await getMarketOptions();

            await weth.connect(user).approve(await adapter.getAddress(), ethers.parseEther("1"));

            await expect(
                adapter.connect(user).executeMultiplier(market, WETH_ADDRESS, ethers.parseEther("1"), 20000, "0x", 1n)
            ).to.be.revertedWithCustomError(adapter, "IvalidAmountOut");
        });
    });
});
