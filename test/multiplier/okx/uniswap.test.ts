import { ethers } from "hardhat";
import { expect } from "chai";
import { CometFoundation, UniswapV3Plugin, OKXPlugin, IComet, IERC20 } from "../../../typechain-types";
import { getOKXQuote, getOKXSwapData } from "../../helpers/helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
    executeWithRetry,
    UNI_V3_USDC_WETH_005,
    executeMultiplierOKX as multiply,
    coverOKX as cover,
    calculateMaxLeverage,
    calculateLeveragedAmount,
    calculateExpectedCollateral,
    calculateHealthFactor,
    calculateMaxSafeWithdrawal,
    OKX_ROUTER
} from "../../helpers/helpers";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";

const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

const opts = { maxFeePerGas: 5_000_000_000 };

describe("Comet Multiplier Adapter / OKX / UniswapV3", function () {
    let adapter: CometFoundation;
    let loanPlugin: UniswapV3Plugin;
    let swapPlugin: OKXPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let initialSnapshot: any;
    let treasury: SignerWithAddress;

    async function getMarketOptions() {
        return {
            comet: COMET_USDC_MARKET,
            loanPlugin: await loanPlugin.getAddress(),
            swapPlugin: await swapPlugin.getAddress(),
            flp: UNI_V3_USDC_WETH_005
        };
    }

    before(async function () {
        // await ethers.provider.send("hardhat_reset", [
        //     {
        //         forking: { jsonRpcUrl: process.env.FORKING_URL! }
        //     }
        // ]);
        [owner, user, user2, treasury] = await ethers.getSigners();
        const LoanFactory = await ethers.getContractFactory("UniswapV3Plugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);
        const SwapFactory = await ethers.getContractFactory("OKXPlugin", owner);
        swapPlugin = await SwapFactory.deploy(opts);

        const plugins = [
            {
                endpoint: await loanPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(
                    ["tuple(address token, address pool)[]"],
                    [[{ token: USDC_ADDRESS, pool: UNI_V3_USDC_WETH_005 }]]
                )
            },
            {
                endpoint: await swapPlugin.getAddress(),
                // Config: (router, approveProxy) - OKX uses ApproveProxy to pull tokens
                config: ethers.AbiCoder.defaultAbiCoder().encode(
                    ["address", "address"],
                    [OKX_ROUTER, "0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f"] // OKX ApproveProxy
                )
            }
        ];

        const Adapter = await ethers.getContractFactory("CometFoundation", owner);

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        adapter = await Adapter.deploy(plugins, await weth.getAddress(), await treasury.getAddress(), opts);
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

            await multiply(weth, await getMarketOptions(), comet, adapter, user2, initialAmount, leverage);

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

            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

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

            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, maxLeverage);

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

            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);

            const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.closeTo(expectedCollateral, (expectedCollateral * 2n) / 100n);
            expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
            expect(collateralBalance).to.be.gt(initialAmount);
            expect(borrowBalance).to.be.gt(0);
        });
    });

    describe("Position Health", function () {
        beforeEach(async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);
        });

        it("should maintain healthy position after withdrawal", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 10n;

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw, treasury);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(healthFactor).to.be.gt(finalDebt);
            expect(finalCol).to.be.closeTo(initialCol - collateralToWithdraw, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalUsdc).to.be.gt(initialUsdc);
        });
    });

    describe("Withdraw Multiplier", function () {
        beforeEach(async function () {
            const initialAmount = ethers.parseEther("0.2");
            const leverage = 25_000;
            await multiply(weth, await getMarketOptions(), comet, adapter, user, initialAmount, leverage);
        });

        it("should withdraw quarter of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 4n;

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw, treasury);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol - collateralToWithdraw, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalDebt).to.be.gt(0);
            expect(finalUsdc).to.be.gte(initialUsdc);
            expect(healthFactor).to.be.gt(finalDebt);
        });

        it("should withdraw half of collateral position", async function () {
            const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialUsdc = await usdc.balanceOf(user.address);

            const collateralToWithdraw = initialCol / 2n;

            await cover(await getMarketOptions(), adapter, user, collateralToWithdraw, treasury);

            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalUsdc = await usdc.balanceOf(user.address);
            const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);

            expect(finalCol).to.be.closeTo(initialCol / 2n, ethers.parseEther("0.01"));
            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalUsdc).to.be.gte(initialUsdc);
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

            await cover(await getMarketOptions(), adapter, user, ethers.MaxUint256, treasury);

            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
            const finalUsdc = await usdc.balanceOf(user.address);
            const finalWeth = await weth.balanceOf(user.address);

            expect(finalDebt).to.be.eq(0n);
            expect(finalCol).to.be.eq(0n);
            expect(finalUsdc).to.be.gte(initialUsdc);
            const usdcReceived = finalUsdc - initialUsdc;
            const collateralValueInUsdc = (initialCol * price * baseScale) / (info.scale * 100_000_000n);
            const expectedUsdcProfit = collateralValueInUsdc - initialDebt;
            expect(usdcReceived).to.be.closeTo(expectedUsdcProfit, expectedUsdcProfit / 10n);
            expect(finalWeth).to.be.closeTo(initialWeth, ethers.parseEther("0.01"));
        });
    });
});
