import { ethers } from "hardhat";
import { expect } from "chai";
import { CometFoundation, EulerV2Plugin, LiFiPlugin, IComet, IERC20, ICometExt } from "../../../typechain-types";
import {
    calculateMaxSafeWithdrawal,
    calculateHealthFactor,
    executeMultiplierLiFi as multiply,
    coverLiFi as cover,
    calculateMaxLeverage,
    calculateLeveragedAmount,
    calculateExpectedCollateral,
    executeWithRetry,
    getQuote,
    WETH_ADDRESS,
    USDC_ADDRESS,
    WETH_WHALE,
    COMET_USDC_MARKET,
    LIFI_ROUTER,
    USDC_EVAULT,
    getUserNonce,
    getFutureExpiry,
    signAllowBySig,
    WST_ETH,
    USDC_WHALE
} from "../../helpers/helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const opts = { maxFeePerGas: 5_000_000_000 };

describe("Comet Multiplier Adapter / LiFi / Euler", function () {
    let adapter: CometFoundation;
    let loanPlugin: EulerV2Plugin;
    let swapPlugin: LiFiPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;
    let initialSnapshot: any;
    let treasury: SignerWithAddress;

    async function getMarketOptions() {
        return {
            comet: COMET_USDC_MARKET,
            loanPlugin: await loanPlugin.getAddress(),
            swapPlugin: await swapPlugin.getAddress()
        };
    }

    before(async function () {
        await ethers.provider.send("hardhat_reset", [
            {
                forking: { jsonRpcUrl: process.env.FORKING_URL! }
            }
        ]);

        [owner, user, user2, user3, treasury] = await ethers.getSigners();

        const LoanFactory = await ethers.getContractFactory("EulerV2Plugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);

        const SwapFactory = await ethers.getContractFactory("LiFiPlugin", owner);
        swapPlugin = await SwapFactory.deploy(opts);

        const plugins = [
            {
                endpoint: await loanPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(
                    ["tuple(address token, address pool)[]"],
                    [[{ token: USDC_ADDRESS, pool: USDC_EVAULT }]]
                )
            },
            {
                endpoint: await swapPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [LIFI_ROUTER])
            }
        ];

        const Adapter = await ethers.getContractFactory("CometFoundation", owner);

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        adapter = await Adapter.deploy(plugins, WETH_ADDRESS, await treasury.getAddress(), opts);

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
            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

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

            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.closeTo(expectedCollateral, expectedCollateral / 100n);
            expect(finalDebt).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(finalCol).to.be.gt(initialCol + initialAmount);
            expect(finalDebt).to.be.gt(initialDebt);
        });

        it("should execute with 2x leverage", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await multiply(weth, await getMarketOptions(), comet, adapter, user2, initialAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user2.address);

            expect(finalCol).to.be.closeTo(expectedCollateral, expectedCollateral / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(finalCol).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should execute with 3x leverage", async function () {
            const initialAmount = ethers.parseEther("0.05");
            const leverage = 30_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.closeTo(expectedCollateral, expectedCollateral / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(finalCol).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should execute with maximum leverage", async function () {
            const initialAmount = ethers.parseEther("0.05");
            const maxLeverage = await calculateMaxLeverage(comet);
            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, maxLeverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, maxLeverage);

            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, maxLeverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 3n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 10n);
        });

        it("should handle large collateral amounts", async function () {
            const initialAmount = ethers.parseEther("20");
            const leverage = 15_000;

            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);

            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

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
                // @ts-ignore
                adapter
                    .connect(user2)
                    [
                        "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                    ](market, WETH_ADDRESS, initialAmount, leverage, 100, "0x")
            ).to.be.reverted;
        });

        it("should revert if comet zero address", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            const market = {
                comet: ethers.ZeroAddress,
                loanPlugin: await loanPlugin.getAddress(),
                swapPlugin: await swapPlugin.getAddress()
            };

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                    ](market, WETH_ADDRESS, initialAmount, leverage, 100, "0x")
            ).to.be.revertedWithCustomError(adapter, "InvalidComet");
        });

        it("should revert with zero collateral amount", async function () {
            const initialAmount = 0n;
            const leverage = 20_000;
            const market = await getMarketOptions();

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                    ](market, WETH_ADDRESS, initialAmount, leverage, 100, "0x")
            ).to.be.reverted;
        });

        it("should revert with leverage below 1x", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 9_000;
            const market = await getMarketOptions();

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                    ](market, WETH_ADDRESS, initialAmount, leverage, 100, "0x")
            ).to.be.reverted;
        });

        it("should revert with leverage above maximum", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const market = await getMarketOptions();

            let maxLeverage = await calculateMaxLeverage(comet);

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                    ](market, WETH_ADDRESS, initialAmount, maxLeverage, 100, "0x")
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

            // @ts-ignore
            const tx = await adapter
                .connect(user)
                [
                    "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                ](market, WETH_ADDRESS, 0, leveraged, 100, quote.swapCalldata, {
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
                initialAmount + BigInt(gasUsed),
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

            // @ts-ignore
            await adapter
                .connect(user2)
                [
                    "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                ](market, WETH_ADDRESS, 0, leveraged, 100, quote.swapCalldata, {
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

            // @ts-ignore
            await adapter
                .connect(user)
                [
                    "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                ](market, WETH_ADDRESS, 0, leveraged, 100, quote.swapCalldata, {
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
            const leveraged = await calculateLeveragedAmount(comet, initialAmount, leverage);

            await expect(
                adapter
                    .connect(user)
                    [
                        "multiply((address,address,address),address,uint256,uint256,uint256,bytes)"
                    ](market, fakeToken, 0, leveraged, 100, "0x", { ...opts, value: initialAmount })
            ).to.be.revertedWithCustomError(adapter, "InvalidWeth");
        });
    });

    describe("Position Health", function () {
        beforeEach(async function () {
            await ethers.provider.send("evm_revert", [initialSnapshot]);
            initialSnapshot = await ethers.provider.send("evm_snapshot");
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);
        });

        it("should maintain healthy position after withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 10n;

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw);

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
                await cover(await getMarketOptions(), adapter, user, conservativeWithdrawal);

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

            await multiply(weth, await getMarketOptions(), comet, adapter, user2, initialAmount, maxLeverage - 1000);

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
            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);
        });

        it("should withdraw quarter of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 4n;

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw);

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

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw);

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

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw);

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

            await cover(await getMarketOptions(), adapter, user, exactAmount);

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

            const collateralValueInUsdc = (initialCol * price * baseScale) / (info.scale * 100_000_000n);
            const expectedUsdcProfit = collateralValueInUsdc - initialDebt;

            await cover(await getMarketOptions(), adapter, user, ethers.MaxUint256);

            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalUsdc = await usdc.balanceOf(user.address);
            const finalWeth = await weth.balanceOf(user.address);

            expect(finalDebt).to.be.eq(0n);
            expect(finalCol).to.be.eq(0n);

            const usdcReceived = finalUsdc - initialUsdc;
            expect(usdcReceived).to.be.closeTo(expectedUsdcProfit, expectedUsdcProfit / 10n);

            expect(finalWeth).to.be.closeTo(initialWeth, ethers.parseEther("0.01"));
        });

        it("should handle withdrawal larger than balance", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const excessiveAmount = initialCol + ethers.parseEther("1.0");

            await expect(cover(await getMarketOptions(), adapter, user, excessiveAmount)).to.be.revertedWithCustomError(
                adapter,
                "InvalidAmountIn"
            );
        });

        it("should transfer base asset to user after withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = ethers.parseEther("0.03");

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw);

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
            await cover(await getMarketOptions(), adapter, user, smallAmount);

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
                // @ts-ignore
                adapter
                    .connect(user3)
                    [
                        "cover((address,address,address),address,uint256,bytes)"
                    ](market, WETH_ADDRESS, collateralToWithdraw, "0x", opts)
            ).to.be.revertedWithCustomError(adapter, "NothingToDeleverage");
        });

        it("should revert when calculated loan debt is zero", async function () {
            const tinyAmount = 1n;
            const market = await getMarketOptions();

            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            await multiply(weth, market, comet, adapter, user2, initialAmount, leverage);
            await expect(
                // @ts-ignore
                adapter
                    .connect(user2)
                    [
                        "cover((address,address,address),address,uint256,bytes)"
                    ](market, WETH_ADDRESS, tinyAmount, "0x", opts)
            ).to.be.revertedWithCustomError(adapter, "InvalidLeverage");
        });

        it("should revert if comet zero address on withdrawal", async function () {
            const collateralToWithdraw = ethers.parseEther("0.1");
            const market = {
                comet: ethers.ZeroAddress,
                loanPlugin: await loanPlugin.getAddress(),
                swapPlugin: await swapPlugin.getAddress()
            };

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "cover((address,address,address),address,uint256,bytes)"
                    ](market, WETH_ADDRESS, collateralToWithdraw, "0x", opts)
            ).to.be.revertedWithCustomError(adapter, "InvalidComet");
        });

        it("should revert if loan plugin zero address on withdrawal", async function () {
            const collateralToWithdraw = ethers.parseEther("0.1");
            const market = {
                comet: COMET_USDC_MARKET,
                loanPlugin: ethers.ZeroAddress,
                swapPlugin: await swapPlugin.getAddress()
            };

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "cover((address,address,address),address,uint256,bytes)"
                    ](market, WETH_ADDRESS, collateralToWithdraw, "0x", opts)
            ).to.be.revertedWithCustomError(adapter, "UnknownPlugin");
        });

        it("should revert with invalid receiver in quote data on withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const collateralToWithdraw = initialCol / 4n;

            const market = await getMarketOptions();

            const leveraged = await calculateLeveragedAmount(comet, collateralToWithdraw, 10_000);
            const quote = await executeWithRetry(async () => {
                return await getQuote(
                    "1",
                    "1",
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    leveraged.toString(),
                    ethers.ZeroAddress // invalid receiver
                );
            });

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "cover((address,address,address),address,uint256,bytes)"
                    ](market, WETH_ADDRESS, collateralToWithdraw, quote.swapCalldata, opts)
            ).to.be.revertedWithCustomError(adapter, "InvalidReceiver");
        });

        it("revert if asset in quote does not match collateral on withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const collateralToWithdraw = initialCol / 4n;

            const market = await getMarketOptions();

            const leveraged = await calculateLeveragedAmount(comet, collateralToWithdraw, 10_000);
            const quote = await executeWithRetry(async () => {
                return await getQuote(
                    "1",
                    "1",
                    WST_ETH,
                    USDC_ADDRESS,
                    leveraged.toString(),
                    await adapter.getAddress()
                );
            });

            await expect(
                // @ts-ignore
                adapter
                    .connect(user)
                    [
                        "cover((address,address,address),address,uint256,bytes)"
                    ](market, WETH_ADDRESS, collateralToWithdraw, quote.swapCalldata, opts)
            ).to.be.reverted;
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
            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialUsdc = await usdc.balanceOf(user.address);

            let currentCol = initialCol;
            for (let i = 0; i < 3; i++) {
                const withdrawAmount = currentCol / 10n;
                if (withdrawAmount === 0n) break;

                await cover(await getMarketOptions(), adapter, user, withdrawAmount);
                currentCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            }

            const finalUsdc = await usdc.balanceOf(user.address);

            expect(currentCol).to.be.lt(initialCol);
            expect(finalUsdc).to.be.gt(initialUsdc);
        });

        it("should handle deposit after collateral withdrawal", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            await multiply(weth, await getMarketOptions(), comet, adapter, user2, initialAmount, leverage);

            const initialCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const initialUsdc = await usdc.balanceOf(user2.address);

            await cover(await getMarketOptions(), adapter, user2, initialCol / 3n);

            const usdcAfterWithdraw = await usdc.balanceOf(user2.address);

            const additionalAmount = ethers.parseEther("0.05");
            await multiply(weth, await getMarketOptions(), comet, adapter, user2, additionalAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user2.address);

            expect(finalCol).to.be.gt(0);
            expect(finalDebt).to.be.gt(0);
            expect(usdcAfterWithdraw).to.be.gt(initialUsdc);
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
                [
                    "multiply((address,address,address),address,uint256,uint256,uint256,bytes,(uint256,uint256,bytes32,bytes32,uint8))"
                ](market, WETH_ADDRESS, initialAmount, leveraged, 100, swapData, allowParams, opts);

            const finalCol = await comet.collateralBalanceOf(user3.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user3.address);
            const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);
            const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage);

            expect(finalCol).to.be.closeTo(expectedCollateral, expectedCollateral / 100n);
            expect(finalDebt).to.be.closeTo(expectedDebt, expectedDebt / 20n);

            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.true;
        });

        it("should fail to execute leveraged position with allowBySig (expired signature)", async function () {
            const adapterAddress = await adapter.getAddress();
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 20_000;

            let cometExt = await ethers.getContractAt("ICometExt", COMET_USDC_MARKET);
            await cometExt.connect(user3).allow(adapterAddress, false, opts);
            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.false;

            const getPastExpiry = () => {
                const currentTime = Math.floor(Date.now() / 1000);
                return BigInt(currentTime - 10000);
            };

            const nonce = await getUserNonce(cometExt, user3.address);
            const expiry = getPastExpiry();
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

            await expect(
                adapter
                    .connect(user3)
                    [
                        "multiply((address,address,address),address,uint256,uint256,uint256,bytes,(uint256,uint256,bytes32,bytes32,uint8))"
                    ](market, WETH_ADDRESS, initialAmount, leveraged, 100, swapData, allowParams, opts)
            ).to.be.reverted;

            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.false;
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
                [
                    "cover((address,address,address),address,uint256,bytes,(uint256,uint256,bytes32,bytes32,uint8))"
                ](market, WETH_ADDRESS, collateralToWithdraw, swapData, allowParams, opts);
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

        it("should fail to withdraw leveraged position with allowBySig (invalid signature)", async function () {
            const adapterAddress = await adapter.getAddress();
            let cometExt = await ethers.getContractAt("ICometExt", COMET_USDC_MARKET);
            await cometExt.connect(user3).allow(adapterAddress, false, opts);
            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.false;

            const collateralToWithdraw = ethers.parseEther("0.1");

            const nonce = await getUserNonce(cometExt, user3.address);
            const expiry = getFutureExpiry();
            const chainId = Number((await ethers.provider.getNetwork()).chainId);

            // Sign with user2 instead of user3 to produce invalid signature
            const { v, r, s } = await signAllowBySig(
                user2,
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

            await expect(
                adapter
                    .connect(user3)
                    [
                        "cover((address,address,address),address,uint256,bytes,(uint256,uint256,bytes32,bytes32,uint8))"
                    ](market, WETH_ADDRESS, collateralToWithdraw, swapData, allowParams, opts)
            ).to.be.reverted;

            expect(await cometExt.isAllowed(user3.address, adapterAddress)).to.be.false;
        });
    });

    describe("Rescue", function () {
        beforeEach(async function () {
            await ethers.provider.send("evm_revert", [initialSnapshot]);
            initialSnapshot = await ethers.provider.send("evm_snapshot");
        });

        it("Should rescue ERC20 tokens to treasury", async function () {
            const rescueAmount = ethers.parseUnits("100", 6); // 100 USDC
            const usdcWhale = await ethers.getImpersonatedSigner(USDC_WHALE);
            await ethers.provider.send("hardhat_setBalance", [USDC_WHALE, "0x1000000000000000000"]);
            await usdc.connect(usdcWhale).transfer(await adapter.getAddress(), rescueAmount);
            await usdc.transfer(await adapter.getAddress(), rescueAmount, opts);

            const treasuryBalanceBefore = await usdc.balanceOf(await treasury.getAddress());
            const adapterBalanceBefore = await usdc.balanceOf(await adapter.getAddress());

            expect(adapterBalanceBefore).to.equal(rescueAmount);

            await adapter.rescue(usdc, opts);

            const treasuryBalanceAfter = await usdc.balanceOf(await treasury.getAddress());
            const adapterBalanceAfter = await usdc.balanceOf(await adapter.getAddress());

            expect(adapterBalanceAfter).to.equal(0);
            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(rescueAmount);
        });

        it("Should rescue native ETH to treasury", async function () {
            const rescueAmount = ethers.parseEther("1.0");

            // Send ETH to adapter
            await owner.sendTransaction({
                to: await adapter.getAddress(),
                value: rescueAmount
            });

            const treasuryBalanceBefore = await ethers.provider.getBalance(await treasury.getAddress());
            const adapterBalanceBefore = await ethers.provider.getBalance(await adapter.getAddress());

            expect(adapterBalanceBefore).to.equal(rescueAmount);

            await adapter.rescue(ethers.ZeroAddress, opts);

            const treasuryBalanceAfter = await ethers.provider.getBalance(await treasury.getAddress());
            const adapterBalanceAfter = await ethers.provider.getBalance(await adapter.getAddress());

            expect(adapterBalanceAfter).to.equal(0);
            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(rescueAmount);
        });

        it("Should handle rescue with zero balance", async function () {
            const treasuryBalanceBefore = await usdc.balanceOf(await treasury.getAddress());
            const adapterBalanceBefore = await usdc.balanceOf(await adapter.getAddress());

            expect(adapterBalanceBefore).to.equal(0);

            await adapter.rescue(usdc, opts);

            const treasuryBalanceAfter = await usdc.balanceOf(await treasury.getAddress());
            const adapterBalanceAfter = await usdc.balanceOf(await adapter.getAddress());

            expect(adapterBalanceAfter).to.equal(0);
            expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore);
        });
    });
});
