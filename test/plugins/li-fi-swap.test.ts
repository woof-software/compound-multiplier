import { ethers } from "hardhat";
import { getQuote, exp, ZERO_ADDRESS } from "../helpers/helpers";
import { IERC20, LiFiPlugin } from "../../typechain-types";
import {
    impersonateAccount,
    setBalance,
    SnapshotRestorer,
    takeSnapshot
} from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { anyUint } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("LiFi Plugin", function () {
    let snapshot: SnapshotRestorer;

    let lifiPlugin: LiFiPlugin;
    let weth: IERC20;
    let usdc: IERC20;

    let wethWhale: HardhatEthersSigner;

    const CHAIN = "ETH";

    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

    const WETH_WHALE = "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8";

    before(async () => {
        lifiPlugin = await ethers.deployContract("LiFiPlugin", []);

        await impersonateAccount(WETH_WHALE);
        wethWhale = await ethers.getSigner(WETH_WHALE);
        await setBalance(wethWhale.address, exp(1000, 18));

        weth = await ethers.getContractAt("IERC20", WETH, wethWhale);
        usdc = await ethers.getContractAt("IERC20", USDC);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("happy cases", function () {
        it("allows to make a swap", async () => {
            const fromToken = "WETH";
            const toToken = "USDC";
            const fromAmount = exp(1, 18);
            const fromAddress = lifiPlugin.target;

            /// hardcode minAmountOut value to 4k USD per ETH
            const minAmountOut = exp(4000, 6);

            const data = (await getQuote(CHAIN, CHAIN, fromToken, toToken, String(fromAmount), fromAddress))
                .transactionRequest;

            await weth.transfer(lifiPlugin, fromAmount);

            const dstTokenBalanceBefore = await usdc.balanceOf(lifiPlugin);

            await lifiPlugin.executeSwap(data.to, WETH, USDC, fromAmount, minAmountOut, data.data);

            const dstTokenBalanceAfter = await usdc.balanceOf(lifiPlugin);
            expect(dstTokenBalanceAfter).to.be.gt(dstTokenBalanceBefore);
            expect(dstTokenBalanceAfter - dstTokenBalanceBefore).to.be.greaterThanOrEqual(minAmountOut);
        });

        it("emits an event on successful swap", async () => {
            const fromToken = "WETH";
            const toToken = "USDC";
            const fromAmount = exp(1, 18);
            const fromAddress = lifiPlugin.target;

            /// hardcode minAmountOut value to 4k USD per ETH
            const minAmountOut = exp(4000, 6);

            const data = (await getQuote(CHAIN, CHAIN, fromToken, toToken, String(fromAmount), fromAddress))
                .transactionRequest;
            const router = data.to;

            await weth.transfer(lifiPlugin, fromAmount);

            await expect(lifiPlugin.executeSwap(router, WETH, USDC, fromAmount, minAmountOut, data.data))
                .to.emit(lifiPlugin, "SwapExecuted")
                .withArgs(router, WETH, USDC, anyUint);
        });
    });

    describe("unhappy cases", function () {
        const fromToken = "WETH";
        const toToken = "USDC";
        const fromAmount = exp(1, 18);
        const minAmountOut = 1;

        let data: any;
        before(async () => {
            const fromAddress = lifiPlugin.target;
            data = (await getQuote(CHAIN, CHAIN, fromToken, toToken, String(fromAmount), fromAddress))
                .transactionRequest;
        });

        it("reverts if srcToken is address(0)", async () => {
            await expect(
                lifiPlugin.executeSwap(data.to, ZERO_ADDRESS, USDC, fromAmount, minAmountOut, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "ZeroAddress");
        });

        it("reverts if dstToken is address(0)", async () => {
            await expect(
                lifiPlugin.executeSwap(data.to, WETH, ZERO_ADDRESS, fromAmount, minAmountOut, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "ZeroAddress");
        });

        it("reverts if srcTokens is dstToken", async () => {
            await expect(
                lifiPlugin.executeSwap(data.to, WETH, WETH, fromAmount, minAmountOut, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidSwapParameters");
        });

        it("reverts if amountIn is 0", async () => {
            await expect(
                lifiPlugin.executeSwap(data.to, WETH, USDC, 0, minAmountOut, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidSwapParameters");
        });

        it("reverts if minAmountOut is 0", async () => {
            await expect(
                lifiPlugin.executeSwap(data.to, WETH, USDC, fromAmount, 0, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidSwapParameters");
        });

        it("reverts if swap call is failed", async () => {
            // Transfer WETH first, then use invalid call data to force call failure
            await weth.transfer(lifiPlugin, fromAmount);

            const invalidCallData = "0x12345678"; // Invalid call data
            await expect(
                lifiPlugin.executeSwap(data.to, WETH, USDC, fromAmount, minAmountOut, invalidCallData)
            ).to.be.revertedWithCustomError(lifiPlugin, "SwapFailed");
        });

        it("reverts if actual amount out is less than minAmountOut", async () => {
            // Get a real quote first, then set minAmountOut higher than expected output
            const fromAmount = exp(1, 18);
            const fromAddress = lifiPlugin.target;

            const quoteData = (await getQuote(CHAIN, CHAIN, "WETH", "USDC", String(fromAmount), fromAddress))
                .transactionRequest;

            // Set minAmountOut to be 10x higher than the realistic quote would give
            const unrealisticMinAmountOut = exp(50_000, 6); // 50k USDC for 1 WETH (unrealistic)

            await weth.transfer(lifiPlugin, fromAmount);

            await expect(
                lifiPlugin.executeSwap(quoteData.to, WETH, USDC, fromAmount, unrealisticMinAmountOut, quoteData.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InsufficientOutputAmount");
        });
    });
});
