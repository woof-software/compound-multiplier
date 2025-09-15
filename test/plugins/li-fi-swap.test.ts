import { ethers } from "hardhat";
import { getQuote, exp, ZERO_ADDRESS, getSwapPlugins, tokensInstances, getWhales } from "../helpers/helpers";
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
    let router: string;

    let config: string;

    let wethWhale: HardhatEthersSigner;

    const CHAIN = "ETH";

    before(async () => {
        ({ wethWhale } = await getWhales());

        const { lifiPlugin: LiFiPlugin } = await getSwapPlugins();
        lifiPlugin = LiFiPlugin.endpoint;
        router = LiFiPlugin.router;

        config = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [LiFiPlugin.router]);

        ({ weth, usdc } = await tokensInstances());
        weth = weth.connect(wethWhale);

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

            await lifiPlugin.executeSwap(weth, usdc, fromAmount, minAmountOut, config, data.data);

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

            await expect(lifiPlugin.executeSwap(weth, usdc, fromAmount, minAmountOut, config, data.data))
                .to.emit(lifiPlugin, "SwapExecuted")
                .withArgs(router, weth, usdc, anyUint);
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
                lifiPlugin.executeSwap(ZERO_ADDRESS, usdc, fromAmount, minAmountOut, config, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "ZeroAddress");
        });

        it("reverts if dstToken is address(0)", async () => {
            await expect(
                lifiPlugin.executeSwap(weth, ZERO_ADDRESS, fromAmount, minAmountOut, config, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "ZeroAddress");
        });

        it("reverts if srcTokens is dstToken", async () => {
            await expect(
                lifiPlugin.executeSwap(weth, weth, fromAmount, minAmountOut, config, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidSwapParameters");
        });

        it("reverts if amountIn is 0", async () => {
            await expect(
                lifiPlugin.executeSwap(weth, usdc, 0, minAmountOut, config, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidSwapParameters");
        });

        it("reverts if minAmountOut is 0", async () => {
            await expect(
                lifiPlugin.executeSwap(weth, usdc, fromAmount, 0, config, data.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidSwapParameters");
        });

        it("reverts if swap call is failed", async () => {
            // Transfer WETH first, then use invalid call data to force call failure
            await weth.transfer(lifiPlugin, fromAmount);

            const invalidCallData = "0x12345678"; // Invalid call data
            await expect(lifiPlugin.executeSwap(weth, usdc, fromAmount, minAmountOut, config, invalidCallData)).to.be
                .reverted;
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
                lifiPlugin.executeSwap(weth, usdc, fromAmount, unrealisticMinAmountOut, config, quoteData.data)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidAmountOut");
        });
    });
});
