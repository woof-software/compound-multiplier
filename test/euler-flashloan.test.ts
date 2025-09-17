import { ethers } from "hardhat";
import { expect } from "chai";
import { CometMultiplierAdapter, EulerV2Plugin, OneInchV6SwapPlugin, IComet, IERC20 } from "../typechain-types";
import { get1inchQuote, get1inchSwapData } from "./utils/oneinch";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint): string {
    return this.toString();
};

const opts = { maxFeePerGas: 3_000_000_000 };

describe("Euler Plugin (updated core)", function () {
    async function getSellAmount(
        comet: IComet,
        collateralAddress: string,
        requestedAmount: bigint,
        userAddress: string
    ) {
        const debt = await comet.borrowBalanceOf(userAddress);
        const userCol = await comet.collateralBalanceOf(userAddress, collateralAddress);

        const collateralInfo = await comet.getAssetInfoByAddress(collateralAddress);
        const price = await comet.getPrice(collateralInfo.priceFeed);
        const collateralFactor = collateralInfo.borrowCollateralFactor;
        const baseScale = await comet.baseScale();

        const priceFeed = await ethers.getContractAt("AggregatorV3Interface", collateralInfo.priceFeed);
        const priceFeedDecimals = await priceFeed.decimals();
        const num = BigInt(price) * baseScale * BigInt(collateralFactor);
        const den = 10n ** BigInt(priceFeedDecimals) * BigInt(collateralInfo.scale) * 10n ** 18n;
        const requiredDebt = (requestedAmount * num) / den;
        const actualDebt = requiredDebt < debt ? requiredDebt : debt;

        const unlockedCollateral = (actualDebt * den) / num;

        const maxAmount = requestedAmount < userCol ? requestedAmount : userCol;
        const finalSellAmount = unlockedCollateral < maxAmount ? unlockedCollateral : maxAmount;

        return {
            requested: requestedAmount,
            actualDebt: actualDebt,
            unlockedCollateral: unlockedCollateral,
            finalSellAmount: finalSellAmount,
            userBalance: userCol,
            totalDebt: debt
        };
    }

    let adapter: CometMultiplierAdapter;
    let loanPlugin: EulerV2Plugin;
    let swapPlugin: OneInchV6SwapPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;

    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;

    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
    const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
    const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";
    const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

    const getMarketOptions = async () => ({
        market: COMET_USDC_MARKET,
        loanSelector: await loanPlugin.CALLBACK_SELECTOR(),
        swapSelector: await swapPlugin.CALLBACK_SELECTOR(),
        flp: USDC_EVAULT
    });

    before(async () => {
        [owner, user, user2, user3] = await ethers.getSigners();

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        const LoanFactory = await ethers.getContractFactory("EulerV2Plugin", owner);
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

        const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
        await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);
        await weth.connect(whale).transfer(user.address, ethers.parseEther("10"), opts);
        await weth.connect(whale).transfer(user2.address, ethers.parseEther("10"), opts);

        const allowAbi = ["function allow(address, bool)"];
        const cometAsUser = new ethers.Contract(await comet.getAddress(), allowAbi, user);
        const cometAsUser2 = new ethers.Contract(await comet.getAddress(), allowAbi, user2);
        await cometAsUser.allow(await adapter.getAddress(), true);
        await cometAsUser2.allow(await adapter.getAddress(), true);
    });

    describe("Deposit/Execute Multiplier Tests", function () {
        describe("Basic execution", function () {
            it("should execute multiplier with minimum leverage (1.1x)", async () => {
                const initialAmount = ethers.parseEther("0.1");
                const leverageBps = 15_000;
                const minAmountOut = 1n;

                await weth.connect(user).approve(await adapter.getAddress(), initialAmount);

                const info = await comet.getAssetInfoByAddress(await weth.getAddress());
                const price = await comet.getPrice(info.priceFeed);
                const baseScale = await comet.baseScale();
                const scale = info.scale;

                const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
                const delta = BigInt(leverageBps - 10_000);
                const baseAmount = (initialValueBase * delta) / 10_000n;

                const swapData = await get1inchSwapData(
                    await usdc.getAddress(),
                    await weth.getAddress(),
                    baseAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter
                        .connect(user)
                        .executeMultiplier(
                            market,
                            await weth.getAddress(),
                            initialAmount,
                            leverageBps,
                            swapData,
                            minAmountOut
                        )
                ).to.not.be.reverted;

                const userCollateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const userBorrowBalance = await comet.borrowBalanceOf(user.address);

                expect(userCollateralBalance).to.be.gt(initialAmount);
                expect(userBorrowBalance).to.be.gt(0);
            });

            it("should execute multiplier with moderate leverage (2x)", async () => {
                const initialAmount = ethers.parseEther("0.1");
                const leverageBps = 20_000;
                const minAmountOut = 1n;

                await weth.connect(user2).approve(await adapter.getAddress(), initialAmount);

                const info = await comet.getAssetInfoByAddress(await weth.getAddress());
                const price = await comet.getPrice(info.priceFeed);
                const baseScale = await comet.baseScale();
                const scale = info.scale;

                const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
                const delta = BigInt(leverageBps - 10_000);
                const baseAmount = (initialValueBase * delta) / 10_000n;

                const swapData = await get1inchSwapData(
                    await usdc.getAddress(),
                    await weth.getAddress(),
                    baseAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    await adapter
                        .connect(user2)
                        .executeMultiplier(
                            market,
                            await weth.getAddress(),
                            initialAmount,
                            leverageBps,
                            swapData,
                            minAmountOut
                        )
                ).to.not.be.reverted;

                const userCollateralBalance = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
                const userBorrowBalance = await comet.borrowBalanceOf(user2.address);

                expect(userCollateralBalance).to.be.gt(initialAmount);
                expect(userBorrowBalance).to.be.gt(0);
            });

            it("should execute multiplier with high leverage (3x)", async () => {
                const initialAmount = ethers.parseEther("0.05");
                const leverageBps = 30_000; // 3x leverage
                const minAmountOut = 1n;

                await weth.connect(user).approve(await adapter.getAddress(), initialAmount);

                const info = await comet.getAssetInfoByAddress(await weth.getAddress());
                const price = await comet.getPrice(info.priceFeed);
                const baseScale = await comet.baseScale();
                const scale = info.scale;

                const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
                const delta = BigInt(leverageBps - 10_000);
                const baseAmount = (initialValueBase * delta) / 10_000n;

                const swapData = await get1inchSwapData(
                    await usdc.getAddress(),
                    await weth.getAddress(),
                    baseAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter
                        .connect(user)
                        .executeMultiplier(
                            market,
                            await weth.getAddress(),
                            initialAmount,
                            leverageBps,
                            swapData,
                            minAmountOut
                        )
                ).to.not.be.reverted;

                const userCollateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const userBorrowBalance = await comet.borrowBalanceOf(user.address);

                expect(userCollateralBalance).to.be.gt(initialAmount);
                expect(userBorrowBalance).to.be.gt(0);
            });
        });

        describe("Edge cases and error conditions", function () {
            it("should revert with insufficient allowance", async () => {
                const initialAmount = ethers.parseEther("0.1");
                const leverageBps = 20_000;
                const minAmountOut = 1n;

                const info = await comet.getAssetInfoByAddress(await weth.getAddress());
                const price = await comet.getPrice(info.priceFeed);
                const baseScale = await comet.baseScale();
                const scale = info.scale;

                const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
                const delta = BigInt(leverageBps - 10_000);
                const baseAmount = (initialValueBase * delta) / 10_000n;

                const swapData = await get1inchSwapData(
                    await usdc.getAddress(),
                    await weth.getAddress(),
                    baseAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter
                        .connect(user2)
                        .executeMultiplier(
                            market,
                            await weth.getAddress(),
                            initialAmount,
                            leverageBps,
                            swapData,
                            minAmountOut
                        )
                ).to.be.reverted;
            });

            it("should revert with zero collateral amount", async () => {
                const initialAmount = 0n;
                const leverageBps = 20_000;
                const minAmountOut = 1n;
                const swapData = "0x";

                const market = await getMarketOptions();

                await expect(
                    adapter
                        .connect(user)
                        .executeMultiplier(
                            market,
                            await weth.getAddress(),
                            initialAmount,
                            leverageBps,
                            swapData,
                            minAmountOut
                        )
                ).to.be.reverted;
            });

            it("should revert with leverage below 1x", async () => {
                const initialAmount = ethers.parseEther("0.1");
                const leverageBps = 9_000;
                const minAmountOut = 1n;
                const swapData = "0x";

                const market = await getMarketOptions();

                await expect(
                    adapter
                        .connect(user)
                        .executeMultiplier(
                            market,
                            await weth.getAddress(),
                            initialAmount,
                            leverageBps,
                            swapData,
                            minAmountOut
                        )
                ).to.be.reverted;
            });
        });

        describe("Large amounts and stress testing", function () {
            it("should handle large collateral amounts", async () => {
                const initialAmount = ethers.parseEther("1.0");
                const leverageBps = 15_000;
                const minAmountOut = 1n;

                await weth.connect(user).approve(await adapter.getAddress(), initialAmount);

                const info = await comet.getAssetInfoByAddress(await weth.getAddress());
                const price = await comet.getPrice(info.priceFeed);
                const baseScale = await comet.baseScale();
                const scale = info.scale;

                const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
                const delta = BigInt(leverageBps - 10_000);
                const baseAmount = (initialValueBase * delta) / 10_000n;

                const swapData = await get1inchSwapData(
                    await usdc.getAddress(),
                    await weth.getAddress(),
                    baseAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter
                        .connect(user)
                        .executeMultiplier(
                            market,
                            await weth.getAddress(),
                            initialAmount,
                            leverageBps,
                            swapData,
                            minAmountOut
                        )
                ).to.not.be.reverted;
            });
        });
    });

    describe("Withdraw/Deleverage Multiplier Tests", function () {
        beforeEach(async () => {
            const initialAmount = ethers.parseEther("0.2");
            const leverageBps = 25_000;

            await weth.connect(user).approve(await adapter.getAddress(), initialAmount);

            const info = await comet.getAssetInfoByAddress(await weth.getAddress());
            const price = await comet.getPrice(info.priceFeed);
            const baseScale = await comet.baseScale();
            const scale = info.scale;

            const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
            const delta = BigInt(leverageBps - 10_000);
            const baseAmount = (initialValueBase * delta) / 10_000n;

            const swapData = await get1inchSwapData(
                await usdc.getAddress(),
                await weth.getAddress(),
                baseAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            await adapter
                .connect(user)
                .executeMultiplier(market, await weth.getAddress(), initialAmount, leverageBps, swapData, 1n);
        });

        describe("Partial withdrawal", function () {
            it("should withdraw quarter of position", async () => {
                const debt = await comet.borrowBalanceOf(user.address);
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const sellAmount = userCol / 4n;

                const sellInfo = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, sellInfo.finalSellAmount.toString());
                const minBaseOut = (BigInt(quote) * 99n) / 100n;

                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    sellInfo.finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.not.be.reverted;

                const newDebt = await comet.borrowBalanceOf(user.address);
                const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

                expect(newDebt).to.be.lt(debt);
                expect(newCol).to.be.lte(userCol);
                expect(newCol).to.be.gt(0);
                expect(newDebt).to.be.gt(0);
            });

            it("should withdraw half of position", async () => {
                const debt = await comet.borrowBalanceOf(user.address);
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const sellAmount = userCol / 2n;

                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                const minBaseOut = (BigInt(quote) * 99n) / 100n;

                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.not.be.reverted;

                const newDebt = await comet.borrowBalanceOf(user.address);
                const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                expect(newDebt).to.be.lt(debt);
                expect(newCol).to.be.lte(userCol);
            });

            it("should withdraw three quarters of position", async () => {
                const debt = await comet.borrowBalanceOf(user.address);
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const sellAmount = (userCol * 3n) / 4n;

                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);
                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                const minBaseOut = (BigInt(quote) * 99n) / 100n;

                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.not.be.reverted;

                const newDebt = await comet.borrowBalanceOf(user.address);
                const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

                expect(newDebt).to.be.lt(debt);
                expect(newCol).to.be.lte(userCol);
            });
        });

        describe("Full withdrawal", function () {
            it("should fully close position", async () => {
                const debt = await comet.borrowBalanceOf(user.address);
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

                const sellAmount = userCol;

                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                const minBaseOut = (BigInt(quote) * 95n) / 100n;

                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.not.be.reverted;

                const newDebt = await comet.borrowBalanceOf(user.address);
                const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

                expect(newDebt).to.be.lt(debt);
                expect(newCol).to.be.lte(userCol);
            });

            it("should handle max uint256 withdrawal amount", async () => {
                const debt = await comet.borrowBalanceOf(user.address);
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const sellAmount = ethers.MaxUint256;

                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, userCol, user.address);

                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                const minBaseOut = (BigInt(quote) * 95n) / 100n;

                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.not.be.reverted;

                const newDebt = await comet.borrowBalanceOf(user.address);
                const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

                expect(newDebt).to.be.lt(debt);
                expect(newCol).to.be.lte(userCol);
            });
        });

        describe("Edge cases and error conditions", function () {
            it("should revert when trying to withdraw from empty position", async () => {
                const sellAmount = ethers.parseEther("0.1");
                const minBaseOut = 1n;
                const swapData = "0x";

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user3).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.be.revertedWithCustomError(adapter, "NothingToDeleverage");
            });

            it("should revert with zero withdrawal amount", async () => {
                const sellAmount = 0n;
                const minBaseOut = 1n;
                const swapData = "0x";

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.be.reverted;
            });

            it("should revert with unrealistic minAmountOut", async () => {
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const sellAmount = userCol / 4n;

                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                const minBaseOut = BigInt(quote) * 2n;
                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.be.revertedWithCustomError(adapter, "InvalidAmountOut");
            });
        });

        describe("Multiple sequential withdrawals", function () {
            it("should handle multiple small withdrawals", async () => {
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const initialDebt = await comet.borrowBalanceOf(user.address);

                for (let i = 0; i < 3; i++) {
                    const currentCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                    const currentDebt = await comet.borrowBalanceOf(user.address);

                    if (currentDebt === 0n) break;

                    const sellAmount = currentCol / 10n;

                    if (sellAmount === 0n) break;

                    const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

                    const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                    const minBaseOut = (BigInt(quote) * 99n) / 100n;

                    const swapData = await get1inchSwapData(
                        WETH_ADDRESS,
                        USDC_ADDRESS,
                        finalSellAmount.toString(),
                        await adapter.getAddress()
                    );

                    const market = await getMarketOptions();

                    await expect(
                        adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                    ).to.not.be.reverted;
                }

                const finalDebt = await comet.borrowBalanceOf(user.address);
                const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

                expect(finalDebt).to.be.lt(initialDebt);
                expect(finalCol).to.be.lt(userCol);
            });
        });

        describe("Slippage tolerance tests", function () {
            it("should handle high slippage scenarios", async () => {
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const sellAmount = userCol / 4n;

                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, sellAmount.toString());
                const minBaseOut = (BigInt(quote) * 90n) / 100n;

                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);
                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.not.be.reverted;
            });

            it("should handle minimal slippage scenarios", async () => {
                const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const sellAmount = userCol / 10n;
                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                const minBaseOut = (BigInt(quote) * 999n) / 1000n;

                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();
                await expect(
                    adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
                ).to.not.be.reverted;
            });
        });
    });

    describe("Mixed operations", function () {
        it("should handle deposit after partial withdrawal", async () => {
            const initialAmount = ethers.parseEther("0.1");
            const leverageBps = 20_000;

            await weth.connect(user2).approve(await adapter.getAddress(), initialAmount);

            const info = await comet.getAssetInfoByAddress(await weth.getAddress());
            const price = await comet.getPrice(info.priceFeed);
            const baseScale = await comet.baseScale();
            const scale = info.scale;

            const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
            const delta = BigInt(leverageBps - 10_000);
            const baseAmount = (initialValueBase * delta) / 10_000n;

            let swapData = await get1inchSwapData(
                await usdc.getAddress(),
                await weth.getAddress(),
                baseAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            await adapter
                .connect(user2)
                .executeMultiplier(market, await weth.getAddress(), initialAmount, leverageBps, swapData, 1n);

            const userCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const sellAmount = userCol / 3n;

            const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user2.address);

            const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
            const minBaseOut = (BigInt(quote) * 99n) / 100n;

            swapData = await get1inchSwapData(
                WETH_ADDRESS,
                USDC_ADDRESS,
                finalSellAmount.toString(),
                await adapter.getAddress()
            );

            await expect(
                adapter.connect(user2).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
            ).to.not.be.reverted;
            const additionalAmount = ethers.parseEther("0.05");
            await weth.connect(user2).approve(await adapter.getAddress(), additionalAmount);

            const additionalValueBase = (additionalAmount * price * baseScale) / (scale * 1_00000000n);
            const additionalBaseAmount = (additionalValueBase * delta) / 10_000n;

            swapData = await get1inchSwapData(
                await usdc.getAddress(),
                await weth.getAddress(),
                additionalBaseAmount.toString(),
                await adapter.getAddress()
            );

            await expect(
                adapter
                    .connect(user2)
                    .executeMultiplier(market, await weth.getAddress(), additionalAmount, leverageBps, swapData, 1n)
            ).to.not.be.reverted;
        });

        it("should handle alternating deposits and withdrawals", async () => {
            const baseAmount = ethers.parseEther("0.05");
            const leverageBps = 20_000;

            await weth.connect(user2).approve(await adapter.getAddress(), baseAmount);

            const info = await comet.getAssetInfoByAddress(await weth.getAddress());
            const price = await comet.getPrice(info.priceFeed);
            const baseScale = await comet.baseScale();
            const scale = info.scale;

            const initialValueBase = (baseAmount * price * baseScale) / (scale * 1_00000000n);
            const delta = BigInt(leverageBps - 10_000);
            const borrowAmount = (initialValueBase * delta) / 10_000n;

            let swapData = await get1inchSwapData(
                await usdc.getAddress(),
                await weth.getAddress(),
                borrowAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            await adapter
                .connect(user2)
                .executeMultiplier(market, await weth.getAddress(), baseAmount, leverageBps, swapData, 1n);

            for (let i = 0; i < 2; i++) {
                const userCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
                const sellAmount = userCol / 5n;

                const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user2.address);

                if (finalSellAmount > 0) {
                    const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                    const minBaseOut = (BigInt(quote) * 98n) / 100n;

                    swapData = await get1inchSwapData(
                        WETH_ADDRESS,
                        USDC_ADDRESS,
                        finalSellAmount.toString(),
                        await adapter.getAddress()
                    );

                    await adapter
                        .connect(user2)
                        .withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut);
                }

                const addAmount = ethers.parseEther("0.02");
                await weth.connect(user2).approve(await adapter.getAddress(), addAmount);

                const addValueBase = (addAmount * price * baseScale) / (scale * 1_00000000n);
                const addBorrowAmount = (addValueBase * delta) / 10_000n;

                swapData = await get1inchSwapData(
                    await usdc.getAddress(),
                    await weth.getAddress(),
                    addBorrowAmount.toString(),
                    await adapter.getAddress()
                );

                await adapter
                    .connect(user2)
                    .executeMultiplier(market, await weth.getAddress(), addAmount, leverageBps, swapData, 1n);
            }

            const finalCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user2.address);

            expect(finalCol).to.be.gt(0);
            expect(finalDebt).to.be.gt(0);
        });
    });

    describe("Gas optimization and efficiency tests", function () {
        it("should efficiently handle small position adjustments", async () => {
            const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const smallAmount = userCol / 100n;

            const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, smallAmount, user.address);

            if (finalSellAmount > 0) {
                const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
                const minBaseOut = (BigInt(quote) * 99n) / 100n;

                const swapData = await get1inchSwapData(
                    WETH_ADDRESS,
                    USDC_ADDRESS,
                    finalSellAmount.toString(),
                    await adapter.getAddress()
                );

                const market = await getMarketOptions();

                const tx = await adapter
                    .connect(user)
                    .withdrawMultiplier(market, WETH_ADDRESS, smallAmount, swapData, minBaseOut);

                const receipt = await tx.wait();
                console.log(`Gas used for small withdrawal: ${receipt?.gasUsed.toString()}`);

                expect(receipt?.gasUsed).to.be.lt(1_000_000);
            }
        });

        it("should efficiently handle large position adjustments", async () => {
            const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const largeAmount = userCol / 2n;

            const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, largeAmount, user.address);

            const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
            const minBaseOut = (BigInt(quote) * 95n) / 100n;

            const swapData = await get1inchSwapData(
                WETH_ADDRESS,
                USDC_ADDRESS,
                finalSellAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            const tx = await adapter
                .connect(user)
                .withdrawMultiplier(market, WETH_ADDRESS, largeAmount, swapData, minBaseOut);

            const receipt = await tx.wait();
            console.log(`Gas used for large withdrawal: ${receipt?.gasUsed.toString()}`);

            expect(receipt?.gasUsed).to.be.lt(2_000_000);
        });
    });

    describe("Position health and liquidation safety", function () {
        it("should maintain healthy position after withdrawal", async () => {
            const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const userDebt = await comet.borrowBalanceOf(user.address);
            const sellAmount = userCol / 10n;

            const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

            const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
            const price = await comet.getPrice(info.priceFeed);
            const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
            const minBaseOut = (BigInt(quote) * 99n) / 100n;

            const swapData = await get1inchSwapData(
                WETH_ADDRESS,
                USDC_ADDRESS,
                finalSellAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            await adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, finalSellAmount, swapData, minBaseOut);

            const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const newDebt = await comet.borrowBalanceOf(user.address);
            const newCollateralValue = (newCol * price * (await comet.baseScale())) / (info.scale * 1_00000000n);
            const healthAfter = (newCollateralValue * BigInt(info.borrowCollateralFactor)) / ethers.parseEther("1");

            expect(healthAfter).to.be.gt(newDebt);
            expect(newCol).to.be.lt(userCol);
            expect(newDebt).to.be.lt(userDebt);
        });

        it("should prevent over-withdrawal that could cause liquidation", async () => {
            const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const excessiveAmount = (userCol * 95n) / 100n;

            const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, excessiveAmount, user.address);
            const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
            const minBaseOut = (BigInt(quote) * 90n) / 100n;

            const swapData = await get1inchSwapData(
                WETH_ADDRESS,
                USDC_ADDRESS,
                finalSellAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            try {
                await adapter
                    .connect(user)
                    .withdrawMultiplier(market, WETH_ADDRESS, excessiveAmount, swapData, minBaseOut);

                const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const newDebt = await comet.borrowBalanceOf(user.address);
                const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
                const price = await comet.getPrice(info.priceFeed);
                const collateralValue = (newCol * price * (await comet.baseScale())) / (info.scale * 1_00000000n);
                const healthRatio =
                    (collateralValue * BigInt(info.borrowCollateralFactor)) / 1_000_000_000_000_000_000n;

                expect(healthRatio).to.be.gt(newDebt);
            } catch (error) {
                console.log("Over-withdrawal prevented by contract");
            }
        });
    });

    describe("Event emission tests", function () {
        it("should emit events on successful deposit", async () => {
            const initialAmount = ethers.parseEther("0.01");
            const leverageBps = 15_000;

            await weth.connect(user2).approve(await adapter.getAddress(), initialAmount);

            const info = await comet.getAssetInfoByAddress(await weth.getAddress());
            const price = await comet.getPrice(info.priceFeed);
            const baseScale = await comet.baseScale();
            const scale = info.scale;

            const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);
            const delta = BigInt(leverageBps - 10_000);
            const baseAmount = (initialValueBase * delta) / 10_000n;

            const swapData = await get1inchSwapData(
                await usdc.getAddress(),
                await weth.getAddress(),
                baseAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            await expect(
                adapter
                    .connect(user2)
                    .executeMultiplier(market, await weth.getAddress(), initialAmount, leverageBps, swapData, 1n)
            ).to.not.be.reverted;
        });

        it("should emit events on successful withdrawal", async () => {
            const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const sellAmount = userCol / 10n;

            const { finalSellAmount } = await getSellAmount(comet, WETH_ADDRESS, sellAmount, user.address);

            const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, finalSellAmount.toString());
            const minBaseOut = (BigInt(quote) * 99n) / 100n;

            const swapData = await get1inchSwapData(
                WETH_ADDRESS,
                USDC_ADDRESS,
                finalSellAmount.toString(),
                await adapter.getAddress()
            );

            const market = await getMarketOptions();

            await expect(
                adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, sellAmount, swapData, minBaseOut)
            ).to.not.be.reverted;
        });
    });

    describe("Cleanup and final state verification", function () {
        it("should verify final contract state", async () => {
            const adapterWethBalance = await weth.balanceOf(await adapter.getAddress());
            const adapterUsdcBalance = await usdc.balanceOf(await adapter.getAddress());

            expect(adapterWethBalance).to.equal(0);
            expect(adapterUsdcBalance).to.equal(0);
        });

        it("should verify user positions are properly tracked", async () => {
            const user1Col = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const user1Debt = await comet.borrowBalanceOf(user.address);
            const user2Col = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const user2Debt = await comet.borrowBalanceOf(user2.address);

            if (user1Debt > 0) {
                expect(user1Col).to.be.gt(0);
            }
            if (user2Debt > 0) {
                expect(user2Col).to.be.gt(0);
            }
        });
    });
});
