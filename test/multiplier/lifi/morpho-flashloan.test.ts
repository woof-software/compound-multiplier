import { ethers } from "hardhat";
import { expect } from "chai";
import { CometMultiplierAdapter, MorphoPlugin, LiFiPlugin, IComet, IERC20 } from "../../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
    executeWithRetry,
    WETH_ADDRESS,
    USDC_ADDRESS,
    WETH_WHALE,
    COMET_USDC_MARKET,
    MORPHO,
    calculateMaxLeverage,
    calculateLeveragedAmount,
    calculateExpectedCollateral,
    previewTake,
    executeMultiplierLiFi as executeMultiplier,
    withdrawMultiplierLiFi as withdrawMultiplier,
    calculateHealthFactor,
    calculateMaxSafeWithdrawal,
    getQuote,
    getUserNonce,
    getFutureExpiry,
    signAllowBySig
} from "../../helpers/helpers";

const LIFI_ROUTER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";
const opts = { maxFeePerGas: 4_000_000_000 };

describe("Comet Multiplier Adapter / LiFi / Morpho", function () {
    let adapter: CometMultiplierAdapter;
    let loanPlugin: MorphoPlugin;
    let swapPlugin: LiFiPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;
    let initialSnapshot: any;

    async function getMarketOptions() {
        return {
            market: COMET_USDC_MARKET,
            loanPlugin: await loanPlugin.getAddress(),
            swapPlugin: await swapPlugin.getAddress(),
            flp: MORPHO
        };
    }

    before(async function () {
        await ethers.provider.send("hardhat_reset", [
            {
                forking: { jsonRpcUrl: process.env.FORKING_URL! }
            }
        ]);

        [owner, user, user2, user3] = await ethers.getSigners();

        const LoanFactory = await ethers.getContractFactory("MorphoPlugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);

        const SwapFactory = await ethers.getContractFactory("LiFiPlugin", owner);
        swapPlugin = await SwapFactory.deploy(opts);

        const plugins = [
            {
                endpoint: await loanPlugin.getAddress(),
                config: "0x"
            },
            {
                endpoint: await swapPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [LIFI_ROUTER])
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
        await weth.connect(whale).transfer(user3.address, ethers.parseEther("20"), opts);

        const allowAbi = ["function allow(address, bool)"];
        const cometAsUser = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user);
        const cometAsUser2 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user2);
        await cometAsUser.allow(await adapter.getAddress(), true);
        await cometAsUser2.allow(await adapter.getAddress(), true);

        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    describe("Execute Multiplier", function () {
        beforeEach(async function () {
            await ethers.provider.send("evm_revert", [initialSnapshot]);
            initialSnapshot = await ethers.provider.send("evm_snapshot");
        });

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
        it("should execute with msg.value (native ETH) and 1.5x leverage", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 15_000;

            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialEthBalance = await ethers.provider.getBalance(user.address);
            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            const market = await getMarketOptions();
            const leveraged = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const quote = await executeWithRetry(async () => {
                return await getQuote(
                    "1",
                    "1",
                    USDC_ADDRESS,
                    WETH_ADDRESS,
                    leveraged.toString(),
                    await adapter.getAddress()
                );
            });
            const minAmountOut = (BigInt(quote.toAmountMin) * 90n) / 100n;

            const tx = await adapter
                .connect(user)
                .executeMultiplier(market, WETH_ADDRESS, 0, leverage, quote.swapCalldata, minAmountOut, {
                    ...opts,
                    value: initialAmount
                });

            const receipt = await tx.wait();
            const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalEthBalance = await ethers.provider.getBalance(user.address);

            expect(finalCol).to.be.closeTo(expectedCollateral, expectedCollateral / 100n);
            expect(finalDebt).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(finalCol).to.be.gt(initialCol + initialAmount);
            expect(finalDebt).to.be.gt(initialDebt);
            expect(initialEthBalance - finalEthBalance).to.be.closeTo(
                initialAmount + gasUsed,
                ethers.parseEther("0.001")
            );
        });

        it("should execute with msg.value (native ETH) and 2x leverage", async function () {
            const initialAmount = ethers.parseEther("0.15");
            const leverage = 20_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            const market = await getMarketOptions();
            const leveraged = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const quote = await executeWithRetry(async () => {
                return await getQuote(
                    "1",
                    "1",
                    USDC_ADDRESS,
                    WETH_ADDRESS,
                    leveraged.toString(),
                    await adapter.getAddress()
                );
            });
            const minAmountOut = (BigInt(quote.toAmountMin) * 90n) / 100n;

            await adapter
                .connect(user2)
                .executeMultiplier(market, WETH_ADDRESS, 0, leverage, quote.swapCalldata, minAmountOut, {
                    ...opts,
                    value: initialAmount
                });

            const finalCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user2.address);

            expect(finalCol).to.be.closeTo(expectedCollateral, expectedCollateral / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(finalCol).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should execute with msg.value (native ETH) and maximum leverage", async function () {
            const initialAmount = ethers.parseEther("0.05");
            const maxLeverage = await calculateMaxLeverage(comet);
            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, maxLeverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, maxLeverage);

            const market = await getMarketOptions();
            const leveraged = await calculateLeveragedAmount(comet, initialAmount, maxLeverage);
            const quote = await executeWithRetry(async () => {
                return await getQuote(
                    "1",
                    "1",
                    USDC_ADDRESS,
                    WETH_ADDRESS,
                    leveraged.toString(),
                    await adapter.getAddress()
                );
            });
            const minAmountOut = (BigInt(quote.toAmountMin) * 90n) / 100n;

            await adapter
                .connect(user)
                .executeMultiplier(market, WETH_ADDRESS, 0, maxLeverage, quote.swapCalldata, minAmountOut, {
                    ...opts,
                    value: initialAmount
                });

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 3n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 10n);
        });

        it("should revert with msg.value for non-WETH collateral", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            const market = await getMarketOptions();
            const fakeToken = "0x0000000000000000000000000000000000000001";

            await expect(
                adapter
                    .connect(user)
                    .executeMultiplier(market, fakeToken, 0, leverage, "0x", 1n, { ...opts, value: initialAmount })
            ).to.be.revertedWithCustomError(adapter, "InvalidAsset");
        });
    });

    describe("Position Health", function () {
        beforeEach(async function () {
            await ethers.provider.send("evm_revert", [initialSnapshot]);
            initialSnapshot = await ethers.provider.send("evm_snapshot");
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
            await ethers.provider.send("evm_revert", [initialSnapshot]);
            initialSnapshot = await ethers.provider.send("evm_snapshot");
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
            /// !!! slippage > 0.1%
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
                    const q = await getQuote("1", "1", WETH_ADDRESS, USDC_ADDRESS, take.toString(), user.address);
                    return (BigInt(q.toAmountMin) * 85n) / 100n;
                })
            );

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol - smallAmount, ethers.parseEther("0.0005"));
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(await comet.borrowBalanceOf(user.address));
        });

        it("should revert when user has no debt to deleverage", async function () {
            const collateralToWithdraw = ethers.parseEther("0.1");
            const market = await getMarketOptions();

            await expect(
                adapter.connect(user3).withdrawMultiplier(market, WETH_ADDRESS, collateralToWithdraw, "0x", 1n, opts)
            ).to.be.revertedWithCustomError(adapter, "NothingToDeleverage");
        });

        it("should revert when calculated loan debt is zero", async function () {
            const tinyAmount = 1n;
            const market = await getMarketOptions();

            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            await executeMultiplier(weth, market, comet, adapter, user2, initialAmount, leverage);
            await expect(
                adapter.connect(user2).withdrawMultiplier(market, WETH_ADDRESS, tinyAmount, "0x", 0n, opts)
            ).to.be.revertedWithCustomError(adapter, "InvalidLeverage");
        });
    });

    describe("Multiple Operations", function () {
        beforeEach(async function () {
            await ethers.provider.send("evm_revert", [initialSnapshot]);
            initialSnapshot = await ethers.provider.send("evm_snapshot");
        });

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
    describe("Execute and Withdraw with AllowBySig", function () {
        it("should execute leveraged position with allowBySig (no prior authorization)", async function () {
            const adapterAddress = await adapter.getAddress();
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 20_000;

            let cometExt = await ethers.getContractAt("ICometExt", COMET_USDC_MARKET);
            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.false;

            const nonce = await getUserNonce(cometExt, user3.address);
            const expiry = getFutureExpiry();
            const chainId = Number((await ethers.provider.getNetwork()).chainId);

            const { v, r, s } = await signAllowBySig(
                user3,
                await comet.getAddress(),
                adapterAddress,
                true,
                nonce,
                expiry,
                chainId
            );

            const allowParams = {
                nonce: nonce,
                expiry: expiry,
                v: v,
                r: r,
                s: s
            };

            const market = await getMarketOptions();

            await weth.connect(user3).approve(adapterAddress, initialAmount, opts);
            const leveraged = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const quote = await executeWithRetry(async () => {
                return await getQuote(
                    "1",
                    "1",
                    USDC_ADDRESS,
                    WETH_ADDRESS,
                    leveraged.toString(),
                    await adapter.getAddress()
                );
            });
            const swapData = quote.swapCalldata;

            await adapter
                .connect(user3)
                .executeMultiplierBySig(
                    market,
                    WETH_ADDRESS,
                    initialAmount,
                    leverage,
                    swapData,
                    quote.toAmountMin,
                    allowParams,
                    opts
                );

            const finalCol = await comet.collateralBalanceOf(user3.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user3.address);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);
            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            expect(finalCol).to.be.closeTo(expectedCollateral, expectedCollateral / 100n);
            expect(finalDebt).to.be.closeTo(expectedDebt, expectedDebt / 20n);

            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.true;
        });

        it("should withdraw leveraged position with allowBySig (revoked then re-authorized)", async function () {
            const adapterAddress = await adapter.getAddress();
            let cometExt = await ethers.getContractAt("ICometExt", COMET_USDC_MARKET);
            await cometExt.connect(user3).allow(adapterAddress, false, opts);
            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.false;

            const collateralToWithdraw = ethers.parseEther("0.1");

            const nonce = await getUserNonce(cometExt, user3.address);
            const expiry = getFutureExpiry();
            const chainId = Number((await ethers.provider.getNetwork()).chainId);

            const { v, r, s } = await signAllowBySig(
                user3,
                await comet.getAddress(),
                adapterAddress,
                true,
                nonce,
                expiry,
                chainId
            );

            const allowParams = {
                nonce: nonce,
                expiry: expiry,
                v: v,
                r: r,
                s: s
            };

            const initialCol = await comet.collateralBalanceOf(user3.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user3.address);
            const initialUsdc = await usdc.balanceOf(user3.address);

            const market = await getMarketOptions();

            const quote = await executeWithRetry(async () => {
                const q = await getQuote(
                    "1",
                    "1",
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    collateralToWithdraw.toString(),
                    await adapter.getAddress()
                );
                return q;
            });
            const swapData = quote.swapCalldata;

            await adapter
                .connect(user3)
                .withdrawMultiplierBySig(
                    market,
                    WETH_ADDRESS,
                    collateralToWithdraw,
                    swapData,
                    quote.toAmountMin,
                    allowParams,
                    opts
                );
            const finalCol = await comet.collateralBalanceOf(user3.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user3.address);
            const finalUsdc = await usdc.balanceOf(user3.address);
            const healthFactor = await calculateHealthFactor(comet, user3.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol - collateralToWithdraw, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalUsdc).to.be.gt(initialUsdc);
            expect(healthFactor).to.be.gt(finalDebt);

            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.true;
        });
    });
});
