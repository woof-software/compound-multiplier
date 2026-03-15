import { AAVEPlugin, CometFoundation, IComet, IERC20 } from "../../typechain-types";
import {
    ethers,
    exp,
    getCometByAddress,
    getPlugins,
    getWhales,
    Plugin,
    tokensInstances,
    SnapshotRestorer,
    takeSnapshot,
    getLiquidity,
    executeWithRetry,
    getOKXSwapData,
    AAVE_POOL,
    WETH_ADDRESS,
    OKX_ROUTER
} from "../helpers/helpers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const OKX_APPROVE_PROXY = "0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f";
const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";

describe("CometExchange / OKX", function () {
    let snapshot: SnapshotRestorer;

    let collateralSwap: CometFoundation;
    let comet: IComet;

    let weth: IERC20;
    let usdc: IERC20;
    let wstETH: IERC20;

    let aavePl: AAVEPlugin;
    let aavePluginA: Plugin;
    let okxPluginAddr: string;

    let alice: HardhatEthersSigner;
    let treasury: HardhatEthersSigner;

    let wethWhale: HardhatEthersSigner;
    let wstETHWhale: HardhatEthersSigner;

    const SUPPLY_AMOUNT_WETH = exp(2, 18);
    const SUPPLY_AMOUNT_WSTETH = exp(2, 18);
    const BORROW_AMOUNT = exp(500, 6); // 500 USDC

    before(async () => {
        const signers = await ethers.getSigners();
        alice = signers[6];
        treasury = signers[9];

        const { aavePlugin } = await getPlugins();
        aavePl = aavePlugin.endpoint;

        aavePluginA = {
            endpoint: await aavePlugin.endpoint.getAddress(),
            config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [AAVE_POOL])
        };

        const okxPlugin = await ethers.deployContract("OKXPlugin", []);
        okxPluginAddr = await okxPlugin.getAddress();

        collateralSwap = await ethers.deployContract("CometFoundation", [
            [
                aavePluginA,
                {
                    endpoint: okxPluginAddr,
                    config: ethers.AbiCoder.defaultAbiCoder().encode(
                        ["address", "address"],
                        [OKX_ROUTER, OKX_APPROVE_PROXY]
                    )
                }
            ],
            WETH_ADDRESS,
            await treasury.getAddress()
        ]);

        comet = await getCometByAddress(COMET_USDC_MARKET);
        ({ weth, usdc, wstETH } = await tokensInstances());
        ({ wethWhale, wstETHWhale } = await getWhales());

        await weth.connect(wethWhale).transfer(alice, SUPPLY_AMOUNT_WETH);
        await wstETH.connect(wstETHWhale).transfer(alice, SUPPLY_AMOUNT_WSTETH);

        await comet.connect(alice).allow(collateralSwap, true);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    it("should swap WETH to wstETH with a borrow position", async function () {
        const collateralA = weth;
        const collateralB = wstETH;
        const supplyAmount = SUPPLY_AMOUNT_WETH;
        const fromAmount = (supplyAmount * 9995n) / 2n / 10000n;

        const swapParams = {
            opts: {
                loanPlugin: await aavePl.getAddress(),
                swapPlugin: okxPluginAddr,
                comet: COMET_USDC_MARKET
            },
            fromAsset: await collateralA.getAddress(),
            fromAmount,
            toAsset: await collateralB.getAddress(),
            swapCalldata: "",
            minAmountOut: 0n,
            maxHealthFactorDrop: 1500n // 15% of health factor
        };

        // Supply collateral
        await collateralA.connect(alice).approve(comet, supplyAmount);
        await comet.connect(alice).supply(collateralA, supplyAmount);

        // Borrow USDC
        await comet.connect(alice).withdraw(usdc, BORROW_AMOUNT);

        // Pre-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);
        expect(await comet.borrowBalanceOf(alice)).to.be.closeTo(BORROW_AMOUNT, 100);

        const colABefore = await comet.collateralBalanceOf(alice, collateralA);
        const colBBefore = await comet.collateralBalanceOf(alice, collateralB);

        const liqA = await getLiquidity(comet, collateralA, colABefore);
        const liqB = await getLiquidity(comet, collateralB, colBBefore);

        // Perform swap
        await executeWithRetry(async () => {
            const { swapData, amountOut } = await getOKXSwapData(
                swapParams.fromAsset,
                swapParams.toAsset,
                swapParams.fromAmount.toString(),
                String(collateralSwap.target)
            );

            swapParams.swapCalldata = swapData;
            swapParams.minAmountOut = (BigInt(amountOut) * 99n) / 100n;

            await collateralSwap
                .connect(alice)
                [
                    "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata);
        });

        // Post-checks
        expect(await collateralA.balanceOf(collateralSwap)).to.eq(0);
        expect(await collateralB.balanceOf(collateralSwap)).to.eq(0);

        const colAAfter = await comet.collateralBalanceOf(alice, collateralA);
        const colBAfter = await comet.collateralBalanceOf(alice, collateralB);

        const liqAAfter = await getLiquidity(comet, collateralA, colAAfter);
        const liqBAfter = await getLiquidity(comet, collateralB, colBAfter);

        expect(colAAfter).to.eq(colABefore - fromAmount);
        expect(colBAfter).to.be.gt(colBBefore + swapParams.minAmountOut);
        expect(((liqA + liqB) * BigInt(swapParams.maxHealthFactorDrop)) / 10000n).to.be.lessThan(liqAAfter + liqBAfter);
    });
});
