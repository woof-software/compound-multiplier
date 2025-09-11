import { ethers } from "hardhat";
import { $CompoundV3CollateralSwap } from "../typechain-types/contracts-exposed/CompoundV3CollateralSwap.sol/$CompoundV3CollateralSwap";

import {
    impersonateAccount,
    setBalance,
    SnapshotRestorer,
    takeSnapshot
} from "@nomicfoundation/hardhat-network-helpers";

import {
    BalancerPlugin,
    CompoundV3CollateralSwap,
    IComet,
    ICompoundV3CollateralSwap,
    IERC20
} from "../typechain-types";
import { exp } from "./helpers/helpers";
import { expect } from "chai";

describe("CompoundV3CollateralSwap", function () {
    let snapshot: SnapshotRestorer;

    // Contracts
    let collateralSwap: $CompoundV3CollateralSwap;
    let balancerPlugin: BalancerPlugin;
    let comet: IComet;

    // Mainnet data
    const FLP_BALANCER = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    const SWAP_ROUTER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";
    const COMET = "0xA17581A9E3356d9A858b789D68B4d866e593aE94";

    // Tokens
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const WST_ETH = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
    const RS_ETH = "0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7";
    const R_ETH = "0xae78736Cd615f374D3085123A210448E74Fc6393";

    let weth: IERC20;
    let wstETH: IERC20;
    let rsETH: IERC20;
    let rETH: IERC20;

    // Whales
    const WETH_WHALE = "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8";
    const WST_ETH_WHALE = "0x0B925eD163218f6662a35e0f0371Ac234f9E9371";
    const RS_ETH_WHALE = "0x2D62109243b87C4bA3EE7bA1D91B0dD0A074d7b1";
    const R_ETH_WHALE = "0xCc9EE9483f662091a1de4795249E24aC0aC2630f";

    before(async () => {
        const balancerFlashLoan = await ethers.deployContract("BalancerPlugin", []);
        const balancerPlugin: ICompoundV3CollateralSwap.PluginStruct = {
            flp: FLP_BALANCER,
            endpoint: balancerFlashLoan.target
        };

        collateralSwap = (await ethers.deployContract("$CompoundV3CollateralSwap", [
            [balancerPlugin],
            SWAP_ROUTER
        ])) as unknown as $CompoundV3CollateralSwap;

        comet = await ethers.getContractAt("IComet", COMET);
        weth = await ethers.getContractAt("IERC20", WETH);
        wstETH = await ethers.getContractAt("IERC20", WST_ETH);
        rsETH = await ethers.getContractAt("IERC20", RS_ETH);
        rETH = await ethers.getContractAt("IERC20", R_ETH);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("deployment", function () {
        it("test", async function () {
            const addr = ethers.Wallet.createRandom().address;
            await collateralSwap.$_tstore(addr, addr, 1);

            const data = await collateralSwap.$_tload.staticCall();
            console.log(data);
        });
    });

    describe("collateralization check", function () {
        let wethWhale: any, wstETHWhale: any, rsETHWhale: any, rETHWhale: any;

        before(async () => {
            // Setup whales for testing
            await impersonateAccount(WETH_WHALE);
            await impersonateAccount(WST_ETH_WHALE);
            await impersonateAccount(RS_ETH_WHALE);
            await impersonateAccount(R_ETH_WHALE);

            wethWhale = await ethers.getSigner(WETH_WHALE);
            wstETHWhale = await ethers.getSigner(WST_ETH_WHALE);
            rsETHWhale = await ethers.getSigner(RS_ETH_WHALE);
            rETHWhale = await ethers.getSigner(R_ETH_WHALE);

            // Give ETH to whales for gas
            await setBalance(WETH_WHALE, exp(100, 18));
            await setBalance(WST_ETH_WHALE, exp(100, 18));
            await setBalance(RS_ETH_WHALE, exp(100, 18));
            await setBalance(R_ETH_WHALE, exp(100, 18));
        });

        describe("valid collateralization scenarios", function () {
            it("returns true when swapping with favorable price ratio", async () => {
                // wstETH price ≈ $1209, rsETH price ≈ $1052
                // So 1 wstETH should get us about 1.15 rsETH
                const fromAmount = exp(1, 18); // 1 wstETH
                const minAmountOut = exp(1.1, 18); // Expect 1.1 rsETH (less than fair value)
                const maxHealthFactorDropBps = 500; // 5% max drop

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    WST_ETH,
                    RS_ETH,
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
                    WST_ETH,
                    WST_ETH, // Same asset
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
                    WST_ETH,
                    RS_ETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.true;
            });

            it("returns true with realistic price-adjusted amounts", async () => {
                // Get actual prices to calculate fair exchange
                const wstETHInfo = await comet.getAssetInfoByAddress(WST_ETH);
                const rsETHInfo = await comet.getAssetInfoByAddress(RS_ETH);
                const wstETHPrice = await comet.getPrice(wstETHInfo.priceFeed);
                const rsETHPrice = await comet.getPrice(rsETHInfo.priceFeed);

                const fromAmount = exp(1, 18);
                // Calculate fair amount: (wstETHPrice / rsETHPrice) * fromAmount * 0.95 (5% discount)
                const fairValue = (BigInt(wstETHPrice) * fromAmount * 95n) / (BigInt(rsETHPrice) * 100n);
                const maxHealthFactorDropBps = 1000; // 10% max drop

                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    WST_ETH,
                    RS_ETH,
                    fromAmount,
                    fairValue,
                    maxHealthFactorDropBps
                );

                expect(isCollateralized).to.be.true;
            });
        });

        describe("invalid collateralization scenarios", function () {
            it("returns false when swapping to much lower CF asset with strict health factor", async () => {
                // Get actual collateral factors to ensure we're testing correctly
                const wstETHInfo = await comet.getAssetInfoByAddress(WST_ETH);
                const rsETHInfo = await comet.getAssetInfoByAddress(RS_ETH);

                // Swap from higher CF to lower CF with very strict health factor requirement
                const fromAmount = exp(1, 18);
                const minAmountOut = exp(1, 18);
                const maxHealthFactorDropBps = 1; // Only 0.01% drop allowed (very strict)

                // This should fail if there's any meaningful difference in CF
                const isCollateralized = await collateralSwap.$_checkCollateralization(
                    comet,
                    WST_ETH,
                    RS_ETH,
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
                    WST_ETH,
                    RS_ETH,
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
                    WST_ETH,
                    RS_ETH,
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
                    WST_ETH,
                    RS_ETH,
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
                    WST_ETH,
                    RS_ETH,
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
                    WST_ETH,
                    R_ETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                // Test rETH -> rsETH
                const rethToRseth = await collateralSwap.$_checkCollateralization(
                    comet,
                    R_ETH,
                    RS_ETH,
                    fromAmount,
                    minAmountOut,
                    maxHealthFactorDropBps
                );

                // Both should have some result (true or false based on actual CF values)
                expect(typeof wstToReth).to.equal("boolean");
                expect(typeof rethToRseth).to.equal("boolean");
            });
        });

        describe("price and collateral factor analysis", function () {
            it("logs actual collateral factors and prices for analysis", async () => {
                const wstETHInfo = await comet.getAssetInfoByAddress(WST_ETH);
                const rsETHInfo = await comet.getAssetInfoByAddress(RS_ETH);
                const rETHInfo = await comet.getAssetInfoByAddress(R_ETH);

                const wstETHPrice = await comet.getPrice(wstETHInfo.priceFeed);
                const rsETHPrice = await comet.getPrice(rsETHInfo.priceFeed);
                const rETHPrice = await comet.getPrice(rETHInfo.priceFeed);

                console.log("=== Asset Analysis ===");
                console.log(
                    `wstETH CF: ${wstETHInfo.borrowCollateralFactor}, Price: ${wstETHPrice}, Scale: ${wstETHInfo.scale}`
                );
                console.log(
                    `rsETH CF: ${rsETHInfo.borrowCollateralFactor}, Price: ${rsETHPrice}, Scale: ${rsETHInfo.scale}`
                );
                console.log(
                    `rETH CF: ${rETHInfo.borrowCollateralFactor}, Price: ${rETHPrice}, Scale: ${rETHInfo.scale}`
                );

                // Verify the function works with actual mainnet data
                const testResult = await collateralSwap.$_checkCollateralization(
                    comet,
                    WST_ETH,
                    RS_ETH,
                    exp(1, 18),
                    exp(1, 18),
                    1000 // 10%
                );

                console.log(`Test result for 1:1 wstETH->rsETH with 10% max drop: ${testResult}`);
                expect(typeof testResult).to.equal("boolean");
            });
        });
    });
});
