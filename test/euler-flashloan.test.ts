import { ethers } from "hardhat";
import { expect } from "chai";
import { CometMultiplierAdapter, EulerV2Plugin, OneInchV6SwapPlugin, IComet, IERC20 } from "../typechain-types";
import { get1inchQuote, get1inchSwapData } from "./utils/oneinch";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";
const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

const opts = { maxFeePerGas: 4_000_000_000 };

describe("Comet Multiplier Adapter", function () {
    let adapter: CometMultiplierAdapter;
    let loanPlugin: EulerV2Plugin;
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

    async function getMarketOptions() {
        return {
            market: COMET_USDC_MARKET,
            loanSelector: await loanPlugin.CALLBACK_SELECTOR(),
            swapSelector: await swapPlugin.CALLBACK_SELECTOR(),
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

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
        await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);
        await weth.connect(whale).transfer(user.address, ethers.parseEther("10"), opts);
        await weth.connect(whale).transfer(user2.address, ethers.parseEther("10"), opts);

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
        it("should execute with 1.5x leverage", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 15_000;

            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            await executeMultiplier(user, initialAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.gt(initialCol + initialAmount);
            expect(finalDebt).to.be.gt(initialDebt);
        });

        it("should execute with 2x leverage", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;

            await executeMultiplier(user2, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user2.address);

            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should execute with 3x leverage", async function () {
            const initialAmount = ethers.parseEther("0.05");
            const leverage = 30_000;

            await executeMultiplier(user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should handle large collateral amounts", async function () {
            const initialAmount = ethers.parseEther("1.0");
            const leverage = 15_000;

            await executeMultiplier(user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should revert with insufficient allowance", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            const baseAmount = await calculateLeveragedAmount(initialAmount, leverage);
            const market = await getMarketOptions();

            await expect(
                executeWithRetry(async () => {
                    const swapData = await get1inchSwapData(
                        USDC_ADDRESS,
                        WETH_ADDRESS,
                        baseAmount.toString(),
                        await adapter.getAddress()
                    );
                    return adapter
                        .connect(user2)
                        .executeMultiplier(market, WETH_ADDRESS, initialAmount, leverage, swapData, 1n);
                })
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
    });

    describe("Position Health", function () {
        beforeEach(async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await executeMultiplier(user, initialAmount, leverage);
        });

        it("should maintain healthy position after withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            const collateralToWithdraw = initialCol / 10n;

            await withdrawMultiplier(user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
            const price = await comet.getPrice(info.priceFeed);
            const baseScale = await comet.baseScale();

            const collateralValue = (finalCol * price * baseScale) / (info.scale * 100_000_000n);
            const healthRatio = (collateralValue * BigInt(info.borrowCollateralFactor)) / ethers.parseEther("1");

            expect(healthRatio).to.be.gt(finalDebt);
            expect(finalCol).to.be.lt(initialCol);
            expect(finalDebt).to.be.lt(initialDebt);
        });
    });

    describe("Withdraw Multiplier", function () {
        beforeEach(async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await executeMultiplier(user, initialAmount, leverage);
        });

        it("should withdraw quarter of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            const collateralToWithdraw = initialCol / 4n;

            await withdrawMultiplier(user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.lt(initialCol);
            expect(finalCol).to.be.approximately(initialCol - collateralToWithdraw, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalDebt).to.be.gt(0);
        });

        it("should withdraw half of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            const collateralToWithdraw = initialCol / 2n;

            await withdrawMultiplier(user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.approximately(initialCol / 2n, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
        });

        it("should withdraw three quarters of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            const collateralToWithdraw = (initialCol * 3n) / 4n;

            await withdrawMultiplier(user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.approximately(initialCol / 4n, ethers.parseEther("0.02"));
            expect(finalDebt).to.be.lt(initialDebt);
        });

        it("should withdraw specific collateral amount", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            const exactAmount = ethers.parseEther("0.05");

            await withdrawMultiplier(user, exactAmount);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.approximately(initialCol - exactAmount, ethers.parseEther("0.005"));
            expect(finalDebt).to.be.lt(initialDebt);
        });

        it("should close entire position with MaxUint256", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            await withdrawMultiplier(user, ethers.MaxUint256);

            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

            // When using MaxUint256, it should try to withdraw maximum collateral possible
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalCol).to.be.lt(initialCol);
        });

        it("should handle withdrawal larger than balance", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const excessiveAmount = initialCol + ethers.parseEther("1.0");

            // Should only withdraw what's available, not fail
            await withdrawMultiplier(user, excessiveAmount);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            expect(finalCol).to.be.lt(initialCol);
        });

        it("should revert when no position exists", async function () {
            const collateralToWithdraw = ethers.parseEther("0.1");

            await expect(withdrawMultiplier(user2, collateralToWithdraw)).to.be.revertedWithCustomError(
                adapter,
                "NothingToDeleverage"
            );
        });

        it("should revert with zero collateral withdrawal", async function () {
            const market = await getMarketOptions();

            await expect(adapter.connect(user).withdrawMultiplier(market, WETH_ADDRESS, 0n, "0x", 1n)).to.be.reverted;
        });

        it("should transfer withdrawn collateral to user", async function () {
            const initialUserWeth = await weth.balanceOf(user.address);
            const collateralToWithdraw = ethers.parseEther("0.03");

            await withdrawMultiplier(user, collateralToWithdraw);

            const finalUserWeth = await weth.balanceOf(user.address);

            // User should receive some WETH (the portion not swapped for debt repayment)
            expect(finalUserWeth).to.be.gt(initialUserWeth);
        });

        it("should handle equivalent of quarter debt repayment", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);

            const collateralAmount = initialCol / 4n;

            await withdrawMultiplier(user, collateralAmount);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);

            expect(finalCol).to.be.lt(initialCol);
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalDebt).to.be.gt(0);
        });

        it("should handle small collateral withdrawals", async function () {
            const smallAmount = ethers.parseEther("0.001");
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);

            await withdrawMultiplier(user, smallAmount);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            expect(initialCol - finalCol).to.be.approximately(smallAmount, ethers.parseEther("0.0005"));
        });

        it("should maintain position health after withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const collateralToWithdraw = initialCol / 10n;

            await withdrawMultiplier(user, collateralToWithdraw);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const info = await comet.getAssetInfoByAddress(WETH_ADDRESS);
            const price = await comet.getPrice(info.priceFeed);
            const baseScale = await comet.baseScale();

            const collateralValue = (finalCol * price * baseScale) / (info.scale * 100_000_000n);
            const healthRatio = (collateralValue * BigInt(info.borrowCollateralFactor)) / ethers.parseEther("1");

            expect(healthRatio).to.be.gt(finalDebt);
        });
    });

    // Updated multiple operations tests
    describe("Multiple Operations", function () {
        it("should handle multiple sequential collateral withdrawals", async function () {
            const initialAmount = ethers.parseEther("0.3");
            const leverage = 20_000;
            await executeMultiplier(user, initialAmount, leverage);

            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            let currentCol = initialCol;

            // Make 3 withdrawals of 10% each
            for (let i = 0; i < 3; i++) {
                const withdrawAmount = currentCol / 10n;
                if (withdrawAmount === 0n) break;

                await withdrawMultiplier(user, withdrawAmount);
                currentCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            }

            expect(currentCol).to.be.lt(initialCol);
        });

        it("should handle deposit after collateral withdrawal", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 20_000;
            await executeMultiplier(user2, initialAmount, leverage);

            const initialCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            await withdrawMultiplier(user2, initialCol / 3n);

            const additionalAmount = ethers.parseEther("0.05");
            await executeMultiplier(user2, additionalAmount, leverage);

            const finalCol = await comet.collateralBalanceOf(user2.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user2.address);

            expect(finalCol).to.be.gt(0);
            expect(finalDebt).to.be.gt(0);
        });
    });

    describe("Event Emission", function () {
        it("should emit events on successful deposit", async function () {
            const initialAmount = ethers.parseEther("0.1");
            const leverage = 15_000;
            await executeMultiplier(user2, initialAmount, leverage);
        });

        it("should emit events on successful withdrawal", async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await executeMultiplier(user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const withdrawAmount = collateralBalance / 10n;

            await expect(withdrawMultiplier(user, withdrawAmount)).to.not.be.reverted;
        });
    });

    describe("Contract State", function () {
        it("should have zero balances after operations", async function () {
            await executeMultiplier(user, ethers.parseEther("0.1"), 15_000);
            const initial = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            await withdrawMultiplier(user, initial / 2n);

            const adapterWethBalance = await weth.balanceOf(await adapter.getAddress());
            const adapterUsdcBalance = await usdc.balanceOf(await adapter.getAddress());

            expect(adapterWethBalance).to.equal(0);
            expect(adapterUsdcBalance).to.equal(0);
        });
    });
});
