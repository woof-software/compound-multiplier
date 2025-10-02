import { ethers } from "hardhat";
import { expect } from "chai";
import {
    CometMultiplierAdapter,
    EulerV2Plugin,
    OneInchV6SwapPlugin,
    LiFiPlugin,
    IComet,
    IERC20
} from "../../typechain-types";
import {
    executeWithRetry,
    calculateLeveragedAmount,
    calculateExpectedCollateral,
    calculateHealthFactor,
    previewTake,
    get1inchSwapData,
    get1inchQuote,
    getQuote
} from "../helpers/helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
const LIFI_ROUTER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";
const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";
const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

const opts = { maxFeePerGas: 4_000_000_000 };

interface SwapPerformanceMetrics {
    gasUsed: bigint;
    executionTime: number;
    finalCollateral: bigint;
    finalDebt: bigint;
    slippage: number;
    healthFactor: bigint;
}

describe.skip("Comet Multiplier Adapter / Perfomance", function () {
    let oneInchAdapter: CometMultiplierAdapter;
    let lifiAdapter: CometMultiplierAdapter;
    let loanPlugin: EulerV2Plugin;
    let oneInchPlugin: OneInchV6SwapPlugin;
    let lifiPlugin: LiFiPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;
    let user4: SignerWithAddress;
    let initialSnapshot: any;

    async function getOneInchMarketOptions() {
        return {
            market: COMET_USDC_MARKET,
            loanSelector: await loanPlugin.CALLBACK_SELECTOR(),
            swapSelector: await oneInchPlugin.CALLBACK_SELECTOR(),
            flp: USDC_EVAULT
        };
    }

    async function getLiFiMarketOptions() {
        return {
            market: COMET_USDC_MARKET,
            loanSelector: await loanPlugin.CALLBACK_SELECTOR(),
            swapSelector: await lifiPlugin.CALLBACK_SELECTOR(),
            flp: USDC_EVAULT
        };
    }

    async function executeOneInchMultiplier(
        user: SignerWithAddress,
        collateralAmount: bigint,
        leverage: number
    ): Promise<SwapPerformanceMetrics> {
        const startTime = Date.now();

        await weth.connect(user).approve(await oneInchAdapter.getAddress(), collateralAmount);
        const baseAmount = await calculateLeveragedAmount(comet, collateralAmount, leverage);
        const market = await getOneInchMarketOptions();

        const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const expectedCollateral = await calculateExpectedCollateral(collateralAmount, leverage);

        const swapData = await get1inchSwapData(
            USDC_ADDRESS,
            WETH_ADDRESS,
            baseAmount.toString(),
            await oneInchAdapter.getAddress()
        );

        const tx = await oneInchAdapter
            .connect(user)
            .executeMultiplier(market, WETH_ADDRESS, collateralAmount, leverage, swapData, 1n);

        const receipt = await tx.wait();
        const executionTime = Date.now() - startTime;

        const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const finalDebt = await comet.borrowBalanceOf(user.address);
        const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

        const actualCollateral = finalCol - initialCol;
        const slippage = Number(((expectedCollateral - actualCollateral) * 10000n) / expectedCollateral) / 100;

        return {
            gasUsed: receipt!.gasUsed,
            executionTime,
            finalCollateral: finalCol,
            finalDebt,
            slippage,
            healthFactor
        };
    }

    async function executeLiFiMultiplier(
        user: SignerWithAddress,
        collateralAmount: bigint,
        leverage: number
    ): Promise<SwapPerformanceMetrics> {
        const startTime = Date.now();

        await weth.connect(user).approve(await lifiAdapter.getAddress(), collateralAmount);
        const baseAmount = await calculateLeveragedAmount(comet, collateralAmount, leverage);
        const market = await getLiFiMarketOptions();

        const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const expectedCollateral = await calculateExpectedCollateral(collateralAmount, leverage);

        const quote = await getQuote(
            "1",
            "1",
            USDC_ADDRESS,
            WETH_ADDRESS,
            baseAmount.toString(),
            await lifiAdapter.getAddress()
        );

        await Promise.resolve(() => setTimeout(() => {}, 2000));

        const tx = await lifiAdapter
            .connect(user)
            .executeMultiplier(market, WETH_ADDRESS, collateralAmount, leverage, quote.swapCalldata, 1n);

        const receipt = await tx.wait();
        const executionTime = Date.now() - startTime;

        const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const finalDebt = await comet.borrowBalanceOf(user.address);
        const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

        const actualCollateral = finalCol - initialCol;
        const slippage = Number(((expectedCollateral - actualCollateral) * 10000n) / expectedCollateral) / 100;

        return {
            gasUsed: receipt!.gasUsed,
            executionTime,
            finalCollateral: finalCol,
            finalDebt,
            slippage,
            healthFactor
        };
    }

    async function withdrawOneInch(
        user: SignerWithAddress,
        requestedCollateral: bigint
    ): Promise<SwapPerformanceMetrics> {
        const startTime = Date.now();
        const market = await getOneInchMarketOptions();
        const blockTag = await ethers.provider.getBlockNumber();
        const take = await previewTake(comet, user.address, WETH_ADDRESS, requestedCollateral, blockTag);

        const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const initialDebt = await comet.borrowBalanceOf(user.address);

        const swapData =
            take === 0n
                ? "0x"
                : await get1inchSwapData(
                      WETH_ADDRESS,
                      USDC_ADDRESS,
                      take.toString(),
                      await oneInchAdapter.getAddress()
                  );

        const quote =
            take === 0n
                ? 0n
                : await executeWithRetry(async () => {
                      const q = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, take.toString());
                      return (BigInt(q) * 99n) / 100n;
                  });

        const tx = await oneInchAdapter
            .connect(user)
            .withdrawMultiplier(market, WETH_ADDRESS, requestedCollateral, swapData, quote);

        const receipt = await tx.wait();
        const executionTime = Date.now() - startTime;

        const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const finalDebt = await comet.borrowBalanceOf(user.address);
        const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

        const actualWithdrawn = initialCol - finalCol;
        const debtRepaid = initialDebt - finalDebt;

        let withdrawalAccuracy = 0;

        if (requestedCollateral === ethers.MaxUint256) {
            withdrawalAccuracy = finalDebt === 0n ? 0 : (Number(finalDebt) / Number(initialDebt)) * 100;
        } else {
            const expectedWithdrawal = take;
            if (expectedWithdrawal > 0n) {
                const accuracyDiff =
                    expectedWithdrawal > actualWithdrawn
                        ? expectedWithdrawal - actualWithdrawn
                        : actualWithdrawn - expectedWithdrawal;
                withdrawalAccuracy = Number((accuracyDiff * 10000n) / expectedWithdrawal) / 100;
            }
        }

        return {
            gasUsed: receipt!.gasUsed,
            executionTime,
            finalCollateral: finalCol,
            finalDebt,
            slippage: withdrawalAccuracy,
            healthFactor
        };
    }

    async function withdrawLiFi(user: SignerWithAddress, requestedCollateral: bigint): Promise<SwapPerformanceMetrics> {
        const startTime = Date.now();
        const market = await getLiFiMarketOptions();
        const blockTag = await ethers.provider.getBlockNumber();
        const take = await previewTake(comet, user.address, WETH_ADDRESS, requestedCollateral, blockTag);

        const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const initialDebt = await comet.borrowBalanceOf(user.address);

        let swapData = "0x";
        let quote = 0n;

        if (take > 0n) {
            const lifiQuote = await getQuote(
                "1",
                "1",
                WETH_ADDRESS,
                USDC_ADDRESS,
                take.toString(),
                await lifiAdapter.getAddress()
            );

            swapData = lifiQuote.swapCalldata;
            quote = (BigInt(lifiQuote.toAmountMin) * 99n) / 100n;
        }

        const tx = await lifiAdapter
            .connect(user)
            .withdrawMultiplier(market, WETH_ADDRESS, requestedCollateral, swapData, quote);

        const receipt = await tx.wait();
        const executionTime = Date.now() - startTime;

        const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
        const finalDebt = await comet.borrowBalanceOf(user.address);
        const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);
        const actualWithdrawn = initialCol - finalCol;
        const debtRepaid = initialDebt - finalDebt;

        let withdrawalAccuracy = 0;

        if (requestedCollateral === ethers.MaxUint256) {
            withdrawalAccuracy = finalDebt === 0n ? 0 : (Number(finalDebt) / Number(initialDebt)) * 100;
        } else {
            const expectedWithdrawal = take;
            if (expectedWithdrawal > 0n) {
                const accuracyDiff =
                    expectedWithdrawal > actualWithdrawn
                        ? expectedWithdrawal - actualWithdrawn
                        : actualWithdrawn - expectedWithdrawal;
                withdrawalAccuracy = Number((accuracyDiff * 10000n) / expectedWithdrawal) / 100;
            }
        }

        return {
            gasUsed: receipt!.gasUsed,
            executionTime,
            finalCollateral: finalCol,
            finalDebt,
            slippage: withdrawalAccuracy,
            healthFactor
        };
    }

    before(async function () {
        await ethers.provider.send("hardhat_reset", [
            {
                forking: { jsonRpcUrl: process.env.FORKING_URL! }
            }
        ]);

        [owner, user1, user2, user3, user4] = await ethers.getSigners();

        const LoanFactory = await ethers.getContractFactory("EulerV2Plugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);

        const OneInchFactory = await ethers.getContractFactory("OneInchV6SwapPlugin", owner);
        oneInchPlugin = await OneInchFactory.deploy(opts);

        const oneInchPlugins = [
            {
                endpoint: await loanPlugin.getAddress(),
                config: "0x"
            },
            {
                endpoint: await oneInchPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6])
            }
        ];

        const LiFiFactory = await ethers.getContractFactory("LiFiPlugin", owner);
        lifiPlugin = await LiFiFactory.deploy(opts);

        const lifiPlugins = [
            {
                endpoint: await loanPlugin.getAddress(),
                config: "0x"
            },
            {
                endpoint: await lifiPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [LIFI_ROUTER])
            }
        ];

        const AdapterFactory = await ethers.getContractFactory("CometMultiplierAdapter", owner);

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        oneInchAdapter = await AdapterFactory.deploy(oneInchPlugins, await weth.getAddress(), opts);
        lifiAdapter = await AdapterFactory.deploy(lifiPlugins, await weth.getAddress(), opts);

        const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
        await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);

        const fundAmount = ethers.parseEther("5");
        await weth.connect(whale).transfer(user1.address, fundAmount, opts);
        await weth.connect(whale).transfer(user2.address, fundAmount, opts);
        await weth.connect(whale).transfer(user3.address, fundAmount, opts);
        await weth.connect(whale).transfer(user4.address, fundAmount, opts);

        const allowAbi = ["function allow(address, bool)"];

        const cometAsUser1 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user1);
        const cometAsUser2 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user2);
        const cometAsUser3 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user3);
        const cometAsUser4 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user4);

        await cometAsUser1.allow(await oneInchAdapter.getAddress(), true);
        await cometAsUser2.allow(await lifiAdapter.getAddress(), true);
        await cometAsUser3.allow(await oneInchAdapter.getAddress(), true);
        await cometAsUser4.allow(await lifiAdapter.getAddress(), true);

        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    beforeEach(async function () {
        await ethers.provider.send("evm_revert", [initialSnapshot]);
        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    describe("Leverage Execution Performance", function () {
        it("should compare 2x leverage execution - Small Amount", async function () {
            const collateralAmount = ethers.parseEther("0.1");
            const leverage = 20_000;

            console.log("\n=== 2x Leverage Execution (0.1 ETH) ===");

            const [oneInchMetrics, lifiMetrics] = await Promise.allSettled([
                executeOneInchMultiplier(user1, collateralAmount, leverage),
                executeLiFiMultiplier(user2, collateralAmount, leverage)
            ]);

            if (oneInchMetrics.status === "fulfilled" && lifiMetrics.status === "fulfilled") {
                console.log("OneInch Results:");
                console.log(`  Gas Used: ${oneInchMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${oneInchMetrics.value.executionTime}ms`);
                console.log(`  Slippage: ${oneInchMetrics.value.slippage.toFixed(4)}%`);
                console.log(`  Final Collateral: ${ethers.formatEther(oneInchMetrics.value.finalCollateral)} ETH`);

                console.log("\nLiFi Results:");
                console.log(`  Gas Used: ${lifiMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${lifiMetrics.value.executionTime}ms`);
                console.log(`  Slippage: ${lifiMetrics.value.slippage.toFixed(4)}%`);
                console.log(`  Final Collateral: ${ethers.formatEther(lifiMetrics.value.finalCollateral)} ETH`);

                const gasEfficiency = Number(oneInchMetrics.value.gasUsed) / Number(lifiMetrics.value.gasUsed);
                const timeEfficiency = oneInchMetrics.value.executionTime / lifiMetrics.value.executionTime;

                console.log(`\nComparison:`);
                console.log(`  Gas Efficiency (1inch/LiFi): ${gasEfficiency.toFixed(3)}`);
                console.log(`  Time Efficiency (1inch/LiFi): ${timeEfficiency.toFixed(3)}`);
                console.log(
                    `  Better Slippage: ${oneInchMetrics.value.slippage < lifiMetrics.value.slippage ? "OneInch" : "LiFi"}`
                );

                expect(oneInchMetrics.value.finalCollateral).to.be.gt(collateralAmount);
                expect(lifiMetrics.value.finalCollateral).to.be.gt(collateralAmount);
                expect(oneInchMetrics.value.finalDebt).to.be.gt(0);
                expect(lifiMetrics.value.finalDebt).to.be.gt(0);
            } else {
                if (oneInchMetrics.status === "rejected") console.log("OneInch failed:", oneInchMetrics.reason);
                if (lifiMetrics.status === "rejected") console.log("LiFi failed:", lifiMetrics.reason);
            }
        });

        it("should compare 3x leverage execution - Large Amount", async function () {
            const collateralAmount = ethers.parseEther("1.0");
            const leverage = 30_000;

            console.log("\n=== 3x Leverage Execution (1.0 ETH) ===");

            const [oneInchMetrics, lifiMetrics] = await Promise.allSettled([
                executeOneInchMultiplier(user3, collateralAmount, leverage),
                executeLiFiMultiplier(user4, collateralAmount, leverage)
            ]);

            if (oneInchMetrics.status === "fulfilled" && lifiMetrics.status === "fulfilled") {
                console.log("OneInch Results:");
                console.log(`  Gas Used: ${oneInchMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${oneInchMetrics.value.executionTime}ms`);
                console.log(`  Slippage: ${oneInchMetrics.value.slippage.toFixed(4)}%`);
                console.log(`  Final Collateral: ${ethers.formatEther(oneInchMetrics.value.finalCollateral)} ETH`);

                console.log("\nLiFi Results:");
                console.log(`  Gas Used: ${lifiMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${lifiMetrics.value.executionTime}ms`);
                console.log(`  Slippage: ${lifiMetrics.value.slippage.toFixed(4)}%`);
                console.log(`  Final Collateral: ${ethers.formatEther(lifiMetrics.value.finalCollateral)} ETH`);

                const gasEfficiency = Number(oneInchMetrics.value.gasUsed) / Number(lifiMetrics.value.gasUsed);
                const timeEfficiency = oneInchMetrics.value.executionTime / lifiMetrics.value.executionTime;

                console.log(`\nComparison:`);
                console.log(`  Gas Efficiency (1inch/LiFi): ${gasEfficiency.toFixed(3)}`);
                console.log(`  Time Efficiency (1inch/LiFi): ${timeEfficiency.toFixed(3)}`);
                console.log(
                    `  Better Slippage: ${oneInchMetrics.value.slippage < lifiMetrics.value.slippage ? "OneInch" : "LiFi"}`
                );

                expect(oneInchMetrics.value.finalCollateral).to.be.gt(collateralAmount);
                expect(lifiMetrics.value.finalCollateral).to.be.gt(collateralAmount);
            } else {
                if (oneInchMetrics.status === "rejected") console.log("OneInch failed:", oneInchMetrics.reason);
                if (lifiMetrics.status === "rejected") console.log("LiFi failed:", lifiMetrics.reason);
            }
        });
    });

    describe("Deleveraging Performance", function () {
        beforeEach(async function () {
            const setupAmount = ethers.parseEther("0.5");
            const setupLeverage = 25_000;

            await executeOneInchMultiplier(user1, setupAmount, setupLeverage);
            await executeLiFiMultiplier(user2, setupAmount, setupLeverage);
        });

        it("should compare partial withdrawal performance", async function () {
            const initialCol1 = await comet.collateralBalanceOf(user1.address, WETH_ADDRESS);
            const initialCol2 = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);

            const withdrawAmount1 = initialCol1 / 4n;
            const withdrawAmount2 = initialCol2 / 4n;

            console.log("\n=== Partial Withdrawal Performance (25%) ===");

            const [oneInchMetrics, lifiMetrics] = await Promise.allSettled([
                withdrawOneInch(user1, withdrawAmount1),
                withdrawLiFi(user2, withdrawAmount2)
            ]);

            if (oneInchMetrics.status === "fulfilled" && lifiMetrics.status === "fulfilled") {
                console.log("OneInch Withdrawal:");
                console.log(`  Gas Used: ${oneInchMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${oneInchMetrics.value.executionTime}ms`);
                console.log(`  Withdrawal Accuracy: ${oneInchMetrics.value.slippage.toFixed(4)}%`);

                console.log("\nLiFi Withdrawal:");
                console.log(`  Gas Used: ${lifiMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${lifiMetrics.value.executionTime}ms`);
                console.log(`  Withdrawal Accuracy: ${lifiMetrics.value.slippage.toFixed(4)}%`);

                const gasEfficiency = Number(oneInchMetrics.value.gasUsed) / Number(lifiMetrics.value.gasUsed);
                const timeEfficiency = oneInchMetrics.value.executionTime / lifiMetrics.value.executionTime;

                console.log(`\nComparison:`);
                console.log(`  Gas Efficiency (1inch/LiFi): ${gasEfficiency.toFixed(3)}`);
                console.log(`  Time Efficiency (1inch/LiFi): ${timeEfficiency.toFixed(3)}`);

                expect(oneInchMetrics.value.healthFactor).to.be.gt(oneInchMetrics.value.finalDebt);
                expect(lifiMetrics.value.healthFactor).to.be.gt(lifiMetrics.value.finalDebt);
            } else {
                if (oneInchMetrics.status === "rejected")
                    console.log("OneInch withdrawal failed:", oneInchMetrics.reason);
                if (lifiMetrics.status === "rejected") console.log("LiFi withdrawal failed:", lifiMetrics.reason);
            }
        });

        it("should compare full position closure performance", async function () {
            console.log("\n=== Full Position Closure Performance ===");

            const [oneInchMetrics, lifiMetrics] = await Promise.allSettled([
                withdrawOneInch(user1, ethers.MaxUint256),
                withdrawLiFi(user2, ethers.MaxUint256)
            ]);

            if (oneInchMetrics.status === "fulfilled" && lifiMetrics.status === "fulfilled") {
                console.log("OneInch Full Closure:");
                console.log(`  Gas Used: ${oneInchMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${oneInchMetrics.value.executionTime}ms`);
                console.log(`  Final Debt: ${ethers.formatUnits(oneInchMetrics.value.finalDebt, 6)} USDC`);

                console.log("\nLiFi Full Closure:");
                console.log(`  Gas Used: ${lifiMetrics.value.gasUsed.toLocaleString()}`);
                console.log(`  Execution Time: ${lifiMetrics.value.executionTime}ms`);
                console.log(`  Final Debt: ${ethers.formatUnits(lifiMetrics.value.finalDebt, 6)} USDC`);

                const gasEfficiency = Number(oneInchMetrics.value.gasUsed) / Number(lifiMetrics.value.gasUsed);
                const timeEfficiency = oneInchMetrics.value.executionTime / lifiMetrics.value.executionTime;

                console.log(`\nComparison:`);
                console.log(`  Gas Efficiency (1inch/LiFi): ${gasEfficiency.toFixed(3)}`);
                console.log(`  Time Efficiency (1inch/LiFi): ${timeEfficiency.toFixed(3)}`);

                expect(oneInchMetrics.value.finalDebt).to.be.eq(0n);
                expect(lifiMetrics.value.finalDebt).to.be.eq(0n);
                expect(oneInchMetrics.value.finalCollateral).to.be.eq(0n);
                expect(lifiMetrics.value.finalCollateral).to.be.eq(0n);
            } else {
                if (oneInchMetrics.status === "rejected") console.log("OneInch closure failed:", oneInchMetrics.reason);
                if (lifiMetrics.status === "rejected") console.log("LiFi closure failed:", lifiMetrics.reason);
            }
        });
    });
});
