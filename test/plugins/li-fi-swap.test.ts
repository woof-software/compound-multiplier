import { ethers } from "hardhat";
import {
    getQuote,
    exp,
    ZERO_ADDRESS,
    getSwapPlugins,
    tokensInstances,
    getWhales,
    SnapshotRestorer,
    takeSnapshot,
    SWAP_ROUTER
} from "../helpers/helpers";
import { IERC20, LiFiPlugin } from "../../typechain-types";
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
            const { swapCalldata, toAmountMin } = await getQuote(
                CHAIN,
                CHAIN,
                fromToken,
                toToken,
                String(fromAmount),
                fromAddress
            );

            await weth.transfer(lifiPlugin, fromAmount);

            const dstTokenBalanceBefore = await usdc.balanceOf(lifiPlugin);

            await lifiPlugin.executeSwap(weth, usdc, fromAmount, config, swapCalldata);

            const dstTokenBalanceAfter = await usdc.balanceOf(lifiPlugin);
            expect(toAmountMin).to.be.gt(0);
            expect(dstTokenBalanceAfter).to.be.gt(dstTokenBalanceBefore);
            expect(dstTokenBalanceAfter - dstTokenBalanceBefore).to.be.greaterThanOrEqual(toAmountMin);
        });

        it("emits an event on successful swap", async () => {
            const fromToken = "WETH";
            const toToken = "USDC";
            const fromAmount = exp(1, 18);
            const fromAddress = lifiPlugin.target;
            const { swapCalldata } = await getQuote(CHAIN, CHAIN, fromToken, toToken, String(fromAmount), fromAddress);

            await weth.transfer(lifiPlugin, fromAmount);

            await expect(lifiPlugin.executeSwap(weth, usdc, fromAmount, config, swapCalldata))
                .to.emit(lifiPlugin, "Swap")
                .withArgs(SWAP_ROUTER, weth, usdc, anyUint);
        });
    });

    describe("unhappy cases", function () {
        const fromToken = "WETH";
        const toToken = "USDC";
        const fromAmount = exp(1, 18);

        let swapData: string;
        before(async () => {
            const fromAddress = lifiPlugin.target;
            const { swapCalldata } = await getQuote(CHAIN, CHAIN, fromToken, toToken, String(fromAmount), fromAddress);
            swapData = swapCalldata;
        });

        it("reverts if srcToken is address(0)", async () => {
            await expect(
                lifiPlugin.executeSwap(ZERO_ADDRESS, usdc, fromAmount, config, swapData)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidTokens");
        });

        it("reverts if dstToken is address(0)", async () => {
            await expect(
                lifiPlugin.executeSwap(weth, ZERO_ADDRESS, fromAmount, config, swapData)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidTokens");
        });

        it("reverts if srcTokens is dstToken", async () => {
            await expect(
                lifiPlugin.executeSwap(weth, weth, fromAmount, config, swapData)
            ).to.be.revertedWithCustomError(lifiPlugin, "InvalidAmountIn");
        });

        it("reverts if amountIn is 0", async () => {
            await expect(lifiPlugin.executeSwap(weth, usdc, 0, config, swapData)).to.be.revertedWithCustomError(
                lifiPlugin,
                "InvalidAmountIn"
            );
        });

        it("reverts if swap call is failed", async () => {
            // Transfer WETH first, then use invalid call data to force call failure
            await weth.transfer(lifiPlugin, fromAmount);

            const invalidCallData = "0x12345678"; // Invalid call data
            await expect(lifiPlugin.executeSwap(weth, usdc, fromAmount, config, invalidCallData)).to.be.reverted;
        });
    });
});
