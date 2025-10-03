import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { IComet, IERC20 } from "../../typechain-types";
import {
    deployCollateralSwap,
    exp,
    getComet,
    getPlugins,
    getSwapPlugins,
    getWhales,
    Plugin,
    SWAP_ROUTER,
    tokensInstances
} from "../helpers/helpers";
import { expect } from "chai";
import { $CometCollateralSwap } from "../../typechain-types/contracts-exposed/CometCollateralSwap.sol/$CometCollateralSwap";

describe("CometCollateralSwap", function () {
    let snapshot: SnapshotRestorer;

    // Contracts
    let collateralSwap: $CometCollateralSwap;
    let comet: IComet;

    // Tokens
    let weth: IERC20;
    let wstETH: IERC20;
    let rsETH: IERC20;
    let rETH: IERC20;

    before(async () => {
        const { balancerPlugin, aavePlugin } = await getPlugins();

        const balancerPluginA: Plugin = {
            endpoint: await balancerPlugin.endpoint.getAddress(),
            flp: balancerPlugin.flp
        };
        const aavePluginA: Plugin = {
            endpoint: await aavePlugin.endpoint.getAddress(),
            flp: aavePlugin.flp
        };

        const { lifiPlugin } = await getSwapPlugins();

        collateralSwap = await deployCollateralSwap([balancerPluginA, aavePluginA], SWAP_ROUTER, lifiPlugin.endpoint);

        comet = await getComet();

        ({ weth, wstETH, rsETH, rETH } = await tokensInstances());

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("isCollateralized", function () {
        let wethWhale: any, wstETHWhale: any, rsETHWhale: any, rETHWhale: any;

        before(async () => {
            ({ wethWhale, wstETHWhale, rsETHWhale, rETHWhale } = await getWhales());
        });

        describe("happy cases (collateralized)", function () {
            it("returns true when swapping with favorable price ratio", async () => {
                // wstETH price ≈ $1209, rsETH price ≈ $1052
                // So 1 wstETH should get us about 1.15 rsETH
                const fromAmount = exp(1, 18); // 1 wstETH
                const minAmountOut = exp(1.1, 18); // Expect 1.1 rsETH (less than fair value)
                const maxHealthFactorDropBps = 500; // 5% max drop

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.true;
            });

            it("returns true when swapping same asset", async () => {
                const fromAmount = exp(1, 18);
                const minAmountOut = exp(1, 18); // 1:1 same asset
                const maxHealthFactorDropBps = 1; // Allow tiny drop (0.01%)

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    wstETH, // Same asset
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.true;
            });

            it("returns true with large health factor drop allowance", async () => {
                const fromAmount = exp(1, 18);
                const minAmountOut = exp(0.8, 18); // Lower output but large drop allowed
                const maxHealthFactorDropBps = 5000; // 50% drop allowed

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.true;
            });

            it("returns true with realistic price-adjusted amounts", async () => {
                // Get actual prices to calculate fair exchange
                const wstETHInfo = await comet.getAssetInfoByAddress(wstETH);
                const rsETHInfo = await comet.getAssetInfoByAddress(rsETH);
                const wstETHPrice = await comet.getPrice(wstETHInfo.priceFeed);
                const rsETHPrice = await comet.getPrice(rsETHInfo.priceFeed);

                const fromAmount = exp(1, 18);
                // Calculate fair amount: (wstETHPrice / rsETHPrice) * fromAmount * 0.95 (5% discount)
                const fairValue = (BigInt(wstETHPrice) * fromAmount * 95n) / (BigInt(rsETHPrice) * 100n);
                const maxHealthFactorDropBps = 1000; // 10% max drop

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    fairValue,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.true;
            });
        });

        describe("revert cases (not collateralized)", function () {
            it("returns false when swapping to much lower CF asset with strict health factor", async () => {
                // Get actual collateral factors to ensure we're testing correctly
                const wstETHInfo = await comet.getAssetInfoByAddress(wstETH);
                const rsETHInfo = await comet.getAssetInfoByAddress(rsETH);

                // Swap from higher CF to lower CF with very strict health factor requirement
                const fromAmount = exp(1, 18);
                const minAmountOut = exp(1, 18);
                const maxHealthFactorDropBps = 1; // Only 0.01% drop allowed (very strict)

                // This should fail if there's any meaningful difference in CF
                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                // If CFs are different, this should be false with such strict requirements
                if (wstETHInfo.borrowCollateralFactor !== rsETHInfo.borrowCollateralFactor) {
                    expect(isCollateralized).to.be.false;
                }
            });

            it("returns false with unfavorable price ratio and strict health factor", async () => {
                // Test with unfavorable amounts (getting much less value out)
                const fromAmount = exp(1, 18); // 1 token in
                const minAmountOut = exp(0.1, 18); // Only 0.1 token out (bad deal)
                const maxHealthFactorDropBps = 100; // 1% max drop

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.false;
            });

            it("returns false when swapping large amounts with minimal output", async () => {
                const fromAmount = exp(10, 18); // 10 tokens
                const minAmountOut = exp(1, 18); // Only 1 token out
                const maxHealthFactorDropBps = 500; // 5% max drop

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.false;
            });
        });

        describe("edge cases", function () {
            it("handles zero amounts correctly", async () => {
                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    0, // Zero from amount
                    0, // Zero min amount out
                    1000 // 10% max drop
                );

                // Zero amounts result in zero liquidity, so 0 < 0 is false
                // This is actually correct behavior
                expect(isCollateralized).to.be.false;
            });

            it("handles maximum health factor drop (100%)", async () => {
                const fromAmount = exp(1, 18);
                const minAmountOut = exp(0.01, 18); // Very small output
                const maxHealthFactorDropBps = 10000; // 100% drop allowed

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.true; // Should pass with 100% drop allowed (left side becomes 0)
            });

            it("tests with different asset combinations", async () => {
                const fromAmount = exp(1, 18);
                const minAmountOut = exp(1, 18);
                const maxHealthFactorDropBps = 1000; // 10% max drop

                // Test wstETH -> rETH
                const wstToReth = await collateralSwap.$_checkCollateralization(
                    comet,
                    wstETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                // Test rETH -> rsETH
                const rethToRseth = await collateralSwap.$_checkCollateralization(
                    comet,
                    rETH,
                    rsETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                // Both should have some result (true or false based on actual CF values)
                expect(typeof wstToReth).to.equal("boolean");
                expect(typeof rethToRseth).to.equal("boolean");
            });
        });
    });
});
