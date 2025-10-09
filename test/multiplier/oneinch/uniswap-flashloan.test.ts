import { ethers } from "hardhat";
import { expect } from "chai";
import { CometMultiplierAdapter, UniswapV3Plugin, OneInchV6SwapPlugin, IComet, IERC20 } from "../../../typechain-types";
import { get1inchQuote, get1inchSwapData } from "../../helpers/helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
    executeWithRetry,
    UNI_V3_USDC_WETH_005,
    executeMultiplier1Inch as executeMultiplier,
    withdrawMultiplier1Inch as withdrawMultiplier,
    calculateMaxLeverage,
    calculateLeveragedAmount,
    calculateExpectedCollateral,
    calculateHealthFactor,
    calculateMaxSafeWithdrawal,
    previewTake
} from "../../helpers/helpers";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";

const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

const opts = { maxFeePerGas: 4_000_000_000 };

describe.skip("Comet Multiplier Adapter / 1inch / UniswapV3", function () {
    let adapter: CometMultiplierAdapter;
    let loanPlugin: UniswapV3Plugin;
    let swapPlugin: OneInchV6SwapPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let initialSnapshot: any;

    async function getMarketOptions() {
        return {
            market: COMET_USDC_MARKET,
            loanPlugin: await loanPlugin.getAddress(),
            swapPlugin: await swapPlugin.getAddress(),
            flp: UNI_V3_USDC_WETH_005
        };
    }

    before(async function () {
        await ethers.provider.send("hardhat_reset", [
            {
                forking: { jsonRpcUrl: process.env.FORKING_URL! }
            }
        ]);

        [owner, user, user2] = await ethers.getSigners();

        const LoanFactory = await ethers.getContractFactory("UniswapV3Plugin", owner);
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

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        adapter = await Adapter.deploy(plugins, await weth.getAddress(), opts);

        const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
        await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);
        await weth.connect(whale).transfer(user.address, ethers.parseEther("20"), opts);
        await weth.connect(whale).transfer(user2.address, ethers.parseEther("20"), opts);

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

    describe("Execute Multiplier", function () {
        it("should execute with 1.1x leverage", async function () {
            const initialAmount = ethers.parseEther("1");
            const leverage = 11_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 2n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should execute with 1.5x leverage", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 15_000;

            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.closeTo(expectedCollateral, (expectedCollateral * 2n) / 100n);
            expect(finalDebt).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(finalCol).to.be.gt(initialCol + initialAmount);
            expect(finalDebt).to.be.gt(initialDebt);
        });

        it("should execute with 2x leverage", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user2, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user2.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 2n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should execute with 3x leverage", async function () {
            const initialAmount = ethers.parseEther("0.05");
            const leverage = 30_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 2n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should execute with maximum leverage", async function () {
            const initialAmount = ethers.parseEther("0.05");
            const maxLeverage = await calculateMaxLeverage(comet);
            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, maxLeverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, maxLeverage);

            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, maxLeverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 3n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 10n);
        });

        it("should handle large collateral amounts", async function () {
            const initialAmount = ethers.parseEther("1.0");
            const leverage = 15_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 2n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should revert with insufficient allowance", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            const market = await getMarketOptions();

            await expect(
                adapter.connect(user2).executeMultiplier(market, WETH_ADDRESS, initialAmount, leverage, "0x", 1n)
            ).to.be.reverted;
        });

        it("should revert with zero collateral amount", async function () {
            const initialAmount = 0n;
            const leverage = 20_000;
            const market = await getMarketOptions();

            await expect(
                adapter.connect(user).executeMultiplier(market, WETH_ADDRESS, initialAmount, leverage, "0x", 1n)
            ).to.be.reverted;
        });

        it("should revert with leverage below 1x", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 9_000;
            const market = await getMarketOptions();

            await expect(
                adapter.connect(user).executeMultiplier(market, WETH_ADDRESS, initialAmount, leverage, "0x", 1n)
            ).to.be.reverted;
        });

        it("should revert with leverage above maximum", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 60_000;
            const market = await getMarketOptions();

            await expect(
                adapter.connect(user).executeMultiplier(market, WETH_ADDRESS, initialAmount, leverage, "0x", 1n)
            ).to.be.reverted;
        });
    });

    describe("Position Health", function () {
        beforeEach(async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);
        });

        it("should maintain healthy position after withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 10n;

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(healthFactor).to.be.gt(finalDebt);
            expect(finalCol).to.be.closeTo(initialCol - collateralToWithdraw, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalUsdc).to.be.gt(initialUsdc);
        });

        it("should handle accrued interest over time", async function () {
            const initialDebt = await comet.borrowBalanceOf(user.address);

            await ethers.provider.send("evm_increaseTime", [86400 * 30]);
            await ethers.provider.send("evm_mine");

            const accruedDebt = await comet.borrowBalanceOf(user.address);
            expect(accruedDebt).to.be.gt(initialDebt);
            const maxSafeWithdrawal = await calculateMaxSafeWithdrawal(comet, user.address, WETH_ADDRESS);

            const conservativeWithdrawal = maxSafeWithdrawal / 2n;

            if (conservativeWithdrawal > ethers.parseEther("0.001")) {
                await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, conservativeWithdrawal);

                const finalDebt = await comet.borrowBalanceOf(user.address);
                expect(finalDebt).to.be.lt(accruedDebt);

                const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);
                expect(healthFactor).to.be.gt(finalDebt);
            } else {
                const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);
                expect(healthFactor).to.be.gt(accruedDebt);
                console.warn("Position too leveraged for safe withdrawal after interest accrual");
            }
        });

        it("should handle position close to liquidation", async function () {
            const initialAmount = ethers.parseEther("0.05");
            const maxLeverage = await calculateMaxLeverage(comet);

            await executeMultiplier(
                weth,
                await getMarketOptions(),
                comet,
                adapter,
                user2,
                initialAmount,
                maxLeverage - 1000
            );

            const healthFactor = await calculateHealthFactor(comet, user2.address, WETH_ADDRESS);
            const debt = await comet.borrowBalanceOf(user2.address);
            expect(healthFactor).to.be.gt(debt);
            expect(healthFactor).to.be.lt((debt * 110n) / 100n);
        });
    });

    describe("Withdraw Multiplier", function () {
        beforeEach(async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);
        });

        it("should withdraw quarter of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 4n;

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol - collateralToWithdraw, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalDebt).to.be.gt(0);
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(finalDebt);
        });

        it("should withdraw half of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 2n;

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol / 2n, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(finalDebt);
        });

        it("should withdraw three quarters of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = (initialCol * 3n) / 4n;

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol / 4n, ethers.parseEther("0.02"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(finalDebt);
        });

        it("should withdraw specific collateral amount", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const exactAmount = ethers.parseEther("0.05");

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, exactAmount);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol - exactAmount, ethers.parseEther("0.005"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(finalDebt);
        });

        it("should close entire position with MaxUint256", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);
            const initialWeth = await weth.balanceOf(user.address);

            const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
            const price = await comet.getPrice(info.priceFeed);
            const baseScale = await comet.baseScale();

            const debtInCollateralTerms = (initialDebt * info.scale * 100_000_000n) / (price * baseScale);
            const expectedExcessCollateral = initialCol - debtInCollateralTerms;

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, ethers.MaxUint256);

            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalUsdc = await usdc.balanceOf(user.address);
            const finalWeth = await weth.balanceOf(user.address);

            expect(finalDebt).to.be.eq(0n);
            expect(finalCol).to.be.eq(0n);
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(finalWeth).to.be.closeTo(initialWeth + expectedExcessCollateral, ethers.parseEther("0.1"));
        });

        it("should handle withdrawal larger than balance", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const excessiveAmount = initialCol + ethers.parseEther("1.0");

            await expect(
                withdrawMultiplier(await getMarketOptions(), comet, adapter, user, excessiveAmount)
            ).to.be.revertedWithCustomError(adapter, "InvalidCollateralAmount");
        });

        it("should transfer base asset to user after withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = ethers.parseEther("0.03");

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol - collateralToWithdraw, ethers.parseEther("0.005"));
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(await comet.borrowBalanceOf(user.address));
        });

        it("should handle small collateral withdrawals", async function () {
            const smallAmount = ethers.parseEther("0.001");
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialUsdc = await usdc.balanceOf(user.address);

            const blockTag = await ethers.provider.getBlockNumber();
            const take = await previewTake(comet, user.address, WETH_ADDRESS, smallAmount, blockTag);
            await withdrawMultiplier(
                await getMarketOptions(),
                comet,
                adapter,
                user,
                smallAmount,
                await executeWithRetry(async () => {
                    const q = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, take.toString());
                    return (BigInt(q) * 85n) / 100n;
                })
            );

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol - smallAmount, ethers.parseEther("0.0005"));
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(await comet.borrowBalanceOf(user.address));
        });
    });

    describe("Multiple Operations", function () {
        it("should handle multiple sequential collateral withdrawals", async function () {
            const initialAmount = ethers.parseEther("0.3");
            const leverage = 20_000;
            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialUsdc = await usdc.balanceOf(user.address);

            let currentCol = initialCol;
            for (let i = 0; i < 3; i++) {
                const withdrawAmount = currentCol / 10n;
                if (withdrawAmount === 0n) break;

                await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, withdrawAmount);
                currentCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            }

            const finalUsdc = await usdc.balanceOf(user.address);

            expect(currentCol).to.be.lt(initialCol);
            expect(finalUsdc).to.be.gt(initialUsdc);
        });

        it("should handle deposit after collateral withdrawal", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user2, initialAmount, leverage);

            const initialCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const initialUsdc = await usdc.balanceOf(user2.address);

            await withdrawMultiplier(await getMarketOptions(), comet, adapter, user2, initialCol / 3n);

            const usdcAfterWithdraw = await usdc.balanceOf(user2.address);

            const additionalAmount = ethers.parseEther("0.05");
            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user2, additionalAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user2.address);

            expect(finalCol).to.be.gt(0);
            expect(finalDebt).to.be.gt(0);
            expect(usdcAfterWithdraw).to.be.gt(initialUsdc);
        });
    });

    describe("Event Emission", function () {
        it("should emit events on successful deposit", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 15_000;

            const tx = await executeMultiplier(
                weth,
                await getMarketOptions(),
                comet,
                adapter,
                user2,
                initialAmount,
                leverage
            );

            const receipt = await tx.wait();

            const executedEvents = receipt.logs.filter((log: any) => {
                try {
                    const parsed = adapter.interface.parseLog(log);
                    return parsed && parsed.name === "Executed";
                } catch {
                    return false;
                }
            });

            expect(executedEvents.length).to.be.gt(0);

            if (executedEvents.length > 0) {
                const parsedEvent = adapter.interface.parseLog(executedEvents[0]);
                expect(parsedEvent!.args.user).to.equal(user2.address);
                expect(parsedEvent!.args.market).to.equal(COMET_USDC_MARKET);
                expect(parsedEvent!.args.collateral).to.equal(WETH_ADDRESS);
                expect(parsedEvent!.args.totalAmount).to.be.gt(initialAmount);
                expect(parsedEvent!.args.debtAmount).to.be.gt(0);
            }
        });

        it("should emit events on successful withdrawal", async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;

            await executeMultiplier(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const withdrawAmount = collateralBalance / 10n;

            const tx = await withdrawMultiplier(await getMarketOptions(), comet, adapter, user, withdrawAmount);
            const receipt = await tx.wait();

            const withdrawnEvents = receipt.logs.filter((log: any) => {
                try {
                    const parsed = adapter.interface.parseLog(log);
                    return parsed && parsed.name === "Withdrawn";
                } catch {
                    return false;
                }
            });

            expect(withdrawnEvents.length).to.be.gt(0);

            if (withdrawnEvents.length > 0) {
                const parsedEvent = adapter.interface.parseLog(withdrawnEvents[0]);
                expect(parsedEvent!.args.user).to.equal(user.address);
                expect(parsedEvent!.args.market).to.equal(COMET_USDC_MARKET);
                expect(parsedEvent!.args.collateral).to.equal(WETH_ADDRESS);
                expect(parsedEvent!.args.withdrawnAmount).to.be.gt(0);
                expect(parsedEvent!.args.baseReturned).to.be.gte(0);
            }
        });
    });
});
