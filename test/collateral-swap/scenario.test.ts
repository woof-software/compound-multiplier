import { AAVEPlugin, BalancerPlugin, IComet, ICometCollateralSwap, IERC20 } from "../../typechain-types";
import {
    deployCollateralSwap,
    ethers,
    exp,
    getComet,
    getPlugins,
    getQuote,
    getSwapPlugins,
    getWhales,
    Plugin,
    SWAP_ROUTER,
    tokensInstances,
    SnapshotRestorer,
    takeSnapshot,
    getLiquidity,
    executeWithRetry
} from "../helpers/helpers";
import { expect } from "chai";
import { $CometCollateralSwap } from "../../typechain-types/contracts-exposed/CometCollateralSwap.sol/$CometCollateralSwap";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Collateral Swap Scenarios", function () {
    let snapshot: SnapshotRestorer;

    // Contracts
    let collateralSwap: $CometCollateralSwap;
    let comet: IComet;

    // Tokens
    let weth: IERC20;
    let wstETH: IERC20;
    let rsETH: IERC20;
    let rETH: IERC20;
    let wbtc: IERC20;

    let balancerPl: BalancerPlugin;
    let aavePl: AAVEPlugin;

    let aaveFLP;
    let balancerFLP;

    let lifiPlugin: any;

    let alice: HardhatEthersSigner;

    let balancerPluginA: Plugin;
    let aavePluginA: Plugin;

    // Whales
    let wethWhale: HardhatEthersSigner;
    let wstETHWhale: HardhatEthersSigner;
    let wbtcWhale: HardhatEthersSigner;
    let rsETHWhale: HardhatEthersSigner;

    // constants
    const SUPPLY_AMOUNT = exp(2, 18);
    const BORROW_AMOUNT = exp(2.4, 18);

    before(async () => {
        [alice] = await ethers.getSigners();
        const { balancerPlugin, aavePlugin } = await getPlugins();

        balancerFLP = balancerPlugin.flp;
        aaveFLP = aavePlugin.flp;
        balancerPl = balancerPlugin.endpoint;
        aavePl = aavePlugin.endpoint;

        balancerPluginA = {
            endpoint: await balancerPlugin.endpoint.getAddress(),
            flp: balancerPlugin.flp
        };
        aavePluginA = {
            endpoint: await aavePlugin.endpoint.getAddress(),
            flp: aavePlugin.flp
        };

        ({ lifiPlugin } = await getSwapPlugins());

        collateralSwap = await deployCollateralSwap([balancerPluginA, aavePluginA], SWAP_ROUTER, lifiPlugin.endpoint);

        comet = await getComet();
        ({ weth, wstETH, rsETH, rETH, wbtc } = await tokensInstances());
        ({ wethWhale, wstETHWhale, wbtcWhale, rsETHWhale } = await getWhales());

        await wstETH.connect(wstETHWhale).transfer(alice, SUPPLY_AMOUNT);
        await rsETH.connect(rsETHWhale).transfer(alice, SUPPLY_AMOUNT);
        await wbtc.connect(wbtcWhale).transfer(alice, exp(1, 8));

        await comet.connect(alice).allow(collateralSwap, true);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    it("when user has no borrow position and 1 supplied collateral", async function () {
        /**
         *  Scenario:
         *  User has supplied collateral but has no borrow position
         *  User wants to swap collateral A with half of supply amount to collateral B
         */

        // Prepare data
        const collateralA = wstETH;
        const collateralB = rsETH;
        const supplyAmountCollateralA = SUPPLY_AMOUNT;
        const fromAmount = (supplyAmountCollateralA * 9995n) / 2n / 10000n;

        let swapParams: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await aavePl.CALLBACK_SELECTOR(),
            fromAsset: collateralA,
            fromAmount: fromAmount,
            toAsset: collateralB,
            swapCalldata: "",
            minAmountOut: 0,
            maxHealthFactorDropBps: 500n // 5% of health factor
        };

        const { swapCalldata, toAmountMin } = await getQuote(
            "ETH",
            "ETH",
            "wstETH",
            "rsETH",
            swapParams.fromAmount.toString(),
            String(collateralSwap.target)
        );

        swapParams.swapCalldata = swapCalldata;
        swapParams.minAmountOut = toAmountMin;

        // Supply collateral A
        await collateralA.connect(alice).approve(comet, supplyAmountCollateralA);
        await comet.connect(alice).supply(collateralA, supplyAmountCollateralA);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(0);

        const collateralABalanceBefore = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceBefore = await comet.collateralBalanceOf(alice, collateralB);

        const liquidityCollateralA = await getLiquidity(comet, collateralA, collateralABalanceBefore);
        const liquidityCollateralB = await getLiquidity(comet, collateralB, collateralBBalanceBefore);

        // Perform swap
        await collateralSwap.connect(alice).swap(swapParams);

        // Post-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(0);

        const collateralABalanceAfter = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfter = await comet.collateralBalanceOf(alice, collateralB);

        const liquidityCollateralAAfter = await getLiquidity(comet, collateralA, collateralABalanceAfter);
        const liquidityCollateralBAfter = await getLiquidity(comet, collateralB, collateralBBalanceAfter);

        expect(collateralABalanceAfter).to.eq(collateralABalanceBefore - fromAmount);
        expect(collateralBBalanceAfter).to.be.gt(collateralBBalanceBefore + toAmountMin);
        expect(
            ((liquidityCollateralA + liquidityCollateralB) * BigInt(swapParams.maxHealthFactorDropBps)) / 10000n
        ).to.be.lessThan(liquidityCollateralAAfter + liquidityCollateralBAfter);
    });

    it("when user has no borrow position and 2 supplied collateral", async function () {
        /**
         *  Scenario:
         *  User has 2 supplied collateral but has no borrow position
         *  User wants to swap collateral B with half of supply amount to collateral C
         */

        // Prepare data
        const collateralA = wstETH;
        const collateralB = rsETH;
        const collateralC = wbtc;
        const supplyAmountCollateralA = SUPPLY_AMOUNT;
        const supplyAmountCollateralB = SUPPLY_AMOUNT;
        const fromAmount = (supplyAmountCollateralB * 9995n) / 2n / 10000n;

        let swapParams: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await aavePl.CALLBACK_SELECTOR(),
            fromAsset: collateralB,
            fromAmount: fromAmount,
            toAsset: collateralC,
            swapCalldata: "",
            minAmountOut: 0,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        const { swapCalldata, toAmountMin } = await getQuote(
            "ETH",
            "ETH",
            "rsETH",
            "WBTC",
            swapParams.fromAmount.toString(),
            String(collateralSwap.target)
        );

        swapParams.swapCalldata = swapCalldata;
        swapParams.minAmountOut = toAmountMin;

        // Supply collateral A
        await collateralA.connect(alice).approve(comet, supplyAmountCollateralA);
        await comet.connect(alice).supply(collateralA, supplyAmountCollateralA);

        // Supply collateral B
        await collateralB.connect(alice).approve(comet, supplyAmountCollateralB);
        await comet.connect(alice).supply(collateralB, supplyAmountCollateralB);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(0);

        const collateralABalanceBefore = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceBefore = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceBefore = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralA = await getLiquidity(comet, collateralA, collateralABalanceBefore);
        const liquidityCollateralB = await getLiquidity(comet, collateralB, collateralBBalanceBefore);
        const liquidityCollateralC = await getLiquidity(comet, collateralC, collateralCBalanceBefore);

        // Perform swap
        await executeWithRetry(async () => {
            const tx = collateralSwap.connect(alice).swap(swapParams);
            5;
        });

        // Post-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(0);

        const collateralABalanceAfter = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfter = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceAfter = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralAAfter = await getLiquidity(comet, collateralA, collateralABalanceAfter);
        const liquidityCollateralBAfter = await getLiquidity(comet, collateralB, collateralBBalanceAfter);
        const liquidityCollateralCAfter = await getLiquidity(comet, collateralC, collateralCBalanceAfter);

        expect(collateralABalanceAfter).to.eq(collateralABalanceBefore);
        expect(collateralBBalanceAfter).to.eq(collateralBBalanceBefore - fromAmount);
        expect(collateralCBalanceAfter).to.be.gt(collateralCBalanceBefore + toAmountMin);
        expect(
            ((liquidityCollateralA + liquidityCollateralB + liquidityCollateralCAfter) *
                BigInt(swapParams.maxHealthFactorDropBps)) /
                10000n
        ).to.be.lessThan(liquidityCollateralAAfter + liquidityCollateralBAfter + liquidityCollateralCAfter);
    });

    it("when user has a borrow position and 2 supplied collateral", async function () {
        /**
         *  Scenario:
         *  User has 2 supplied collateral and has borrow position
         *  User wants to swap collateral B with half of supply amount to collateral C
         */

        // Prepare data
        const collateralA = wstETH;
        const collateralB = rsETH;
        const collateralC = wbtc;
        const supplyAmountCollateralA = SUPPLY_AMOUNT;
        const supplyAmountCollateralB = SUPPLY_AMOUNT;
        const fromAmount = (supplyAmountCollateralB * 9995n) / 2n / 10000n;

        let swapParams: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await aavePl.CALLBACK_SELECTOR(),
            fromAsset: collateralB,
            fromAmount: fromAmount,
            toAsset: collateralC,
            swapCalldata: "",
            minAmountOut: 0,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        const { swapCalldata, toAmountMin } = await getQuote(
            "ETH",
            "ETH",
            "rsETH",
            "WBTC",
            swapParams.fromAmount.toString(),
            String(collateralSwap.target)
        );

        swapParams.swapCalldata = swapCalldata;
        swapParams.minAmountOut = toAmountMin;

        // Supply collateral A
        await collateralA.connect(alice).approve(comet, supplyAmountCollateralA);
        await comet.connect(alice).supply(collateralA, supplyAmountCollateralA);

        // Supply collateral B
        await collateralB.connect(alice).approve(comet, supplyAmountCollateralB);
        await comet.connect(alice).supply(collateralB, supplyAmountCollateralB);

        // Borrow
        await comet.connect(alice).withdraw(weth, BORROW_AMOUNT);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.closeTo(BORROW_AMOUNT, 100);

        const collateralABalanceBefore = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceBefore = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceBefore = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralA = await getLiquidity(comet, collateralA, collateralABalanceBefore);
        const liquidityCollateralB = await getLiquidity(comet, collateralB, collateralBBalanceBefore);

        // Perform swap
        await collateralSwap.connect(alice).swap(swapParams);

        // Post-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);

        const collateralABalanceAfter = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfter = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceAfter = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralAAfter = await getLiquidity(comet, collateralA, collateralABalanceAfter);
        const liquidityCollateralBAfter = await getLiquidity(comet, collateralB, collateralBBalanceAfter);
        const liquidityCollateralCAfter = await getLiquidity(comet, collateralC, collateralCBalanceAfter);

        expect(collateralABalanceAfter).to.eq(collateralABalanceBefore);
        expect(collateralBBalanceAfter).to.eq(collateralBBalanceBefore - fromAmount);
        expect(collateralCBalanceAfter).to.be.gt(collateralCBalanceBefore + toAmountMin);
        expect(
            ((liquidityCollateralA + liquidityCollateralB + liquidityCollateralCAfter) *
                BigInt(swapParams.maxHealthFactorDropBps)) /
                10000n
        ).to.be.lessThan(liquidityCollateralAAfter + liquidityCollateralBAfter + liquidityCollateralCAfter);
    });

    it("when user has a borrow position and 3 supplied collateral", async function () {
        /**
         *  Scenario:
         *  User has 3 supplied collateral and has borrow position
         *  User wants to swap collateral B with half of supply amount to collateral C
         */

        // Prepare data
        const collateralA = wstETH;
        const collateralB = rsETH;
        const collateralC = wbtc;
        const supplyAmountCollateralA = SUPPLY_AMOUNT;
        const supplyAmountCollateralB = SUPPLY_AMOUNT;
        const supplyAmountCollateralC = exp(0.001, 8);
        const fromAmount = (supplyAmountCollateralB * 9995n) / 2n / 10000n;

        let swapParams: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await aavePl.CALLBACK_SELECTOR(),
            fromAsset: collateralB,
            fromAmount: fromAmount,
            toAsset: collateralC,
            swapCalldata: "",
            minAmountOut: 0,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        const { swapCalldata, toAmountMin } = await getQuote(
            "ETH",
            "ETH",
            "rsETH",
            "WBTC",
            swapParams.fromAmount.toString(),
            String(collateralSwap.target)
        );

        swapParams.swapCalldata = swapCalldata;
        swapParams.minAmountOut = toAmountMin;

        // Supply collateral A
        await collateralA.connect(alice).approve(comet, supplyAmountCollateralA);
        await comet.connect(alice).supply(collateralA, supplyAmountCollateralA);

        // Supply collateral B
        await collateralB.connect(alice).approve(comet, supplyAmountCollateralB);
        await comet.connect(alice).supply(collateralB, supplyAmountCollateralB);

        // Supply collateral C
        await collateralC.connect(alice).approve(comet, supplyAmountCollateralC);
        await comet.connect(alice).supply(collateralC, supplyAmountCollateralC);

        // Borrow
        await comet.connect(alice).withdraw(weth, BORROW_AMOUNT);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(BORROW_AMOUNT);

        const collateralABalanceBefore = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceBefore = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceBefore = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralA = await getLiquidity(comet, collateralA, collateralABalanceBefore);
        const liquidityCollateralB = await getLiquidity(comet, collateralB, collateralBBalanceBefore);

        // Perform swap
        await collateralSwap.connect(alice).swap(swapParams);

        // Post-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);

        const collateralABalanceAfter = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfter = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceAfter = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralAAfter = await getLiquidity(comet, collateralA, collateralABalanceAfter);
        const liquidityCollateralBAfter = await getLiquidity(comet, collateralB, collateralBBalanceAfter);
        const liquidityCollateralCAfter = await getLiquidity(comet, collateralC, collateralCBalanceAfter);

        expect(collateralABalanceAfter).to.eq(collateralABalanceBefore);
        expect(collateralBBalanceAfter).to.eq(collateralBBalanceBefore - fromAmount);
        expect(collateralCBalanceAfter).to.be.gt(collateralCBalanceBefore + toAmountMin);
        expect(
            ((liquidityCollateralA + liquidityCollateralB + liquidityCollateralCAfter) *
                BigInt(swapParams.maxHealthFactorDropBps)) /
                10000n
        ).to.be.lessThan(liquidityCollateralAAfter + liquidityCollateralBAfter + liquidityCollateralCAfter);
    });

    it("several swaps in a row via different flash plugins", async function () {
        /**
         *  Scenario:
         *  User has supplied collateral WBTC and has no borrow position
         *  User wants to swap wbtc to wstETH with half of wbtc supply amount via AAVE
         *  Then user wants to swap wstETH to wbtc with half of wstETH supply amount via Balancer
         *  This tests that the same swap calldata works with different flash loan providers
         */

        // Prepare data
        const collateralA = wbtc; // WBTC
        const collateralB = wstETH; // wstETH
        const supplyAmountCollateralA = exp(0.1, 8); // 0.1 WBTC
        const fromAmountA = (supplyAmountCollateralA * 9995n) / 2n / 10000n; // Half of WBTC supply amount

        // Get swap calldata for wbtc -> wstETH (first swap)
        const { swapCalldata: swapCalldataA, toAmountMin: toAmountMinA } = await getQuote(
            "ETH",
            "ETH",
            "WBTC",
            "wstETH",
            fromAmountA.toString(),
            String(collateralSwap.target)
        );

        let swapParamsA: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await aavePl.CALLBACK_SELECTOR(),
            fromAsset: collateralA,
            fromAmount: fromAmountA,
            toAsset: collateralB,
            swapCalldata: swapCalldataA,
            minAmountOut: toAmountMinA,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        // Supply collateral A (WBTC)
        await collateralA.connect(alice).approve(comet, supplyAmountCollateralA);
        await comet.connect(alice).supply(collateralA, supplyAmountCollateralA);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(0);

        const collateralABalanceBefore = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceBefore = await comet.collateralBalanceOf(alice, collateralB);

        const liquidityCollateralABefore = await getLiquidity(comet, collateralA, collateralABalanceBefore);
        const liquidityCollateralBBefore = await getLiquidity(comet, collateralB, collateralBBalanceBefore);

        // Perform swap A: wbtc -> wstETH via AAVE
        await collateralSwap.connect(alice).swap(swapParamsA);

        // Check intermediate state after first swap
        const collateralABalanceAfterFirstSwap = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfterFirstSwap = await comet.collateralBalanceOf(alice, collateralB);

        // Calculate fromAmountB as half of the wstETH balance obtained from first swap
        const fromAmountB = (collateralBBalanceAfterFirstSwap * 9995n) / 2n / 10000n; // Half of wstETH balance

        // Get swap calldata for wstETH -> wbtc (second swap) using the actual wstETH amount from first swap
        const { swapCalldata: swapCalldataB, toAmountMin: toAmountMinB } = await getQuote(
            "ETH",
            "ETH",
            "wstETH",
            "WBTC",
            fromAmountB.toString(),
            String(collateralSwap.target)
        );

        let swapParamsB: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await balancerPl.CALLBACK_SELECTOR(),
            fromAsset: collateralB, // wstETH
            fromAmount: fromAmountB,
            toAsset: collateralA, // WBTC
            swapCalldata: swapCalldataB,
            minAmountOut: toAmountMinB,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        // Perform swap B: wstETH -> wbtc via Balancer
        await collateralSwap.connect(alice).swap(swapParamsB);

        // Post-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);

        const collateralABalanceAfter = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfter = await comet.collateralBalanceOf(alice, collateralB);

        const liquidityCollateralAAfter = await getLiquidity(comet, collateralA, collateralABalanceAfter);
        const liquidityCollateralBAfter = await getLiquidity(comet, collateralB, collateralBBalanceAfter);

        // Verify first swap: WBTC decreased by half of supply amount, wstETH increased
        expect(collateralABalanceAfterFirstSwap).to.be.closeTo(collateralABalanceBefore - fromAmountA, 10);
        expect(collateralBBalanceAfterFirstSwap).to.be.gt(collateralBBalanceBefore + toAmountMinA);

        // Verify second swap: wstETH decreased by half of its balance, WBTC increased
        expect(collateralBBalanceAfter).to.be.closeTo(collateralBBalanceAfterFirstSwap - fromAmountB, 10);
        expect(collateralABalanceAfter).to.be.gt(collateralABalanceAfterFirstSwap + toAmountMinB);

        // Verify health factor constraints for both swaps
        const totalLiquidityBefore = liquidityCollateralABefore + liquidityCollateralBBefore;
        const totalLiquidityAfter = liquidityCollateralAAfter + liquidityCollateralBAfter;

        expect((totalLiquidityBefore * BigInt(swapParamsA.maxHealthFactorDropBps)) / 10000n).to.be.lessThan(
            totalLiquidityAfter
        );

        expect((totalLiquidityBefore * BigInt(swapParamsB.maxHealthFactorDropBps)) / 10000n).to.be.lessThan(
            totalLiquidityAfter
        );
    });

    it("several swaps in a row via the same flash plugin and different collaterals", async () => {
        /**
         *  Scenario:
         *  User has supplied collateral wstETH
         *  User wants to swap wstETH to rsETH and rETH with 1/4 of wstETH supply amount each via AAVE
         */

        // Prepare data
        const collateralA = wstETH;
        const collateralB = rETH;
        const collateralC = rsETH;
        const supplyAmountCollateralA = exp(0.5, 18);
        const fromAmount = (supplyAmountCollateralA * 9995n) / 4n / 10000n;

        // Get swap calldata for wstETH -> rETH
        const { swapCalldata: swapCalldataB, toAmountMin: toAmountMinB } = await getQuote(
            "ETH",
            "ETH",
            "wstETH",
            "rETH",
            fromAmount.toString(),
            String(collateralSwap.target)
        );

        let swapParamsB: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await aavePl.CALLBACK_SELECTOR(),
            fromAsset: collateralA,
            fromAmount: fromAmount,
            toAsset: collateralB,
            swapCalldata: swapCalldataB,
            minAmountOut: toAmountMinB,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        // Get swap calldata for wstETH -> rsETH
        const { swapCalldata: swapCalldataC, toAmountMin: toAmountMinC } = await getQuote(
            "ETH",
            "ETH",
            "wstETH",
            "rsETH",
            fromAmount.toString(),
            String(collateralSwap.target)
        );

        let swapParamsC: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await aavePl.CALLBACK_SELECTOR(),
            fromAsset: collateralA,
            fromAmount: fromAmount,
            toAsset: collateralC,
            swapCalldata: swapCalldataC,
            minAmountOut: toAmountMinC,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        // Supply collateral A (wstETH)
        await collateralA.connect(alice).approve(comet, supplyAmountCollateralA);
        await comet.connect(alice).supply(collateralA, supplyAmountCollateralA);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(0);

        const collateralABalanceBefore = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceBefore = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceBefore = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralABefore = await getLiquidity(comet, collateralA, collateralABalanceBefore);
        const liquidityCollateralBBefore = await getLiquidity(comet, collateralB, collateralBBalanceBefore);
        const liquidityCollateralCBefore = await getLiquidity(comet, collateralC, collateralCBalanceBefore);

        // Perform swap B: wstETH -> rETH via AAVE
        await collateralSwap.connect(alice).swap(swapParamsB);

        // Check intermediate state
        const collateralABalanceAfterFirstSwap = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfterFirstSwap = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceAfterFirstSwap = await comet.collateralBalanceOf(alice, collateralC);

        // Perform swap C: wstETH -> rsETH via AAVE
        await collateralSwap.connect(alice).swap(swapParamsC);

        // Post-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralC.balanceOf(collateralSwap)).to.eq(0);

        const collateralABalanceAfter = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceAfter = await comet.collateralBalanceOf(alice, collateralB);
        const collateralCBalanceAfter = await comet.collateralBalanceOf(alice, collateralC);

        const liquidityCollateralAAfter = await getLiquidity(comet, collateralA, collateralABalanceAfter);
        const liquidityCollateralBAfter = await getLiquidity(comet, collateralB, collateralBBalanceAfter);
        const liquidityCollateralCAfter = await getLiquidity(comet, collateralC, collateralCBalanceAfter);

        // Verify first swap: wstETH decreased, rETH increased
        expect(collateralABalanceAfterFirstSwap).to.be.closeTo(collateralABalanceBefore - fromAmount, 10);
        expect(collateralBBalanceAfterFirstSwap).to.be.gt(collateralBBalanceBefore + toAmountMinB);
        expect(collateralCBalanceAfterFirstSwap).to.eq(collateralCBalanceBefore);

        // Verify second swap: wstETH decreased from intermediate state, rsETH increased
        expect(collateralABalanceAfter).to.be.closeTo(collateralABalanceAfterFirstSwap - fromAmount, 10);
        expect(collateralCBalanceAfter).to.be.gt(collateralCBalanceAfterFirstSwap + toAmountMinC);
        expect(collateralBBalanceAfter).to.eq(collateralBBalanceAfterFirstSwap);

        // Verify health factor constraints for both swaps
        const totalLiquidityBefore =
            liquidityCollateralABefore + liquidityCollateralBBefore + liquidityCollateralCBefore;
        const totalLiquidityAfter = liquidityCollateralAAfter + liquidityCollateralBAfter + liquidityCollateralCAfter;

        expect((totalLiquidityBefore * BigInt(swapParamsB.maxHealthFactorDropBps)) / 10000n).to.be.lessThan(
            totalLiquidityAfter
        );

        expect((totalLiquidityBefore * BigInt(swapParamsC.maxHealthFactorDropBps)) / 10000n).to.be.lessThan(
            totalLiquidityAfter
        );
    });

    it("fails when borrow position is too close to liquidation and toAsset has smaller borrow collateral factor than fromAsset", async () => {
        /**
         *  Scenario:
         *  User has supplied collateral wstETH and has borrow position
         *  User wants to swap wstETH to wbtc with half of wbtc supply amount via Balancer
         *  But the health factor is too close to liquidation and wstETH has higher borrow collateral factor than wbtc
         *  So the transaction should be reverted on comet side
         */

        // Prepare data
        const collateralA = wstETH;
        const collateralB = wbtc;
        const supplyAmountCollateralA = SUPPLY_AMOUNT;
        const fromAmount = (supplyAmountCollateralA * 9995n) / 2n / 10000n;

        let swapParams: ICometCollateralSwap.SwapParamsStruct = {
            comet: comet,
            callbackSelector: await balancerPl.CALLBACK_SELECTOR(),
            fromAsset: collateralA,
            fromAmount: fromAmount,
            toAsset: collateralB,
            swapCalldata: "",
            minAmountOut: 0,
            maxHealthFactorDropBps: 1500n // 15% of health factor
        };

        const { swapCalldata, toAmountMin } = await getQuote(
            "ETH",
            "ETH",
            "wstETH",
            "WBTC",
            swapParams.fromAmount.toString(),
            String(collateralSwap.target)
        );

        swapParams.swapCalldata = swapCalldata;
        swapParams.minAmountOut = toAmountMin;

        const borrowAmount = supplyAmountCollateralA + exp(0.1, 18);

        // Supply collateral A
        await collateralA.connect(alice).approve(comet, supplyAmountCollateralA);
        await comet.connect(alice).supply(collateralA, supplyAmountCollateralA);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.eq(0);

        const collateralABalanceBefore = await comet.collateralBalanceOf(alice, collateralA);
        const collateralBBalanceBefore = await comet.collateralBalanceOf(alice, collateralB);

        const liquidityCollateralA = await getLiquidity(comet, collateralA, collateralABalanceBefore);
        const liquidityCollateralB = await getLiquidity(comet, collateralB, collateralBBalanceBefore);

        const collateralABalanceAfter = collateralABalanceBefore - fromAmount;
        const collateralBBalanceAfter = collateralBBalanceBefore + toAmountMin;

        const liquidityCollateralAAfter = await getLiquidity(comet, collateralA, collateralABalanceAfter);
        const liquidityCollateralBAfter = await getLiquidity(comet, collateralB, collateralBBalanceAfter);

        expect(liquidityCollateralA + liquidityCollateralB).to.be.greaterThan(
            liquidityCollateralAAfter + liquidityCollateralBAfter
        );

        // Borrow
        await comet.connect(alice).withdraw(weth, borrowAmount);

        await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
            comet,
            "NotCollateralized"
        );
    });
});
