import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

import { AAVEPlugin, BalancerPlugin, IComet, IERC20 } from "../../typechain-types";
import {
    deployCollateralSwap,
    ethers,
    exp,
    getComet,
    getPlugins,
    getWhales,
    Plugin,
    SWAP_ROUTER,
    tokensInstances
} from "../helpers/helpers";
import { expect } from "chai";
import { $CompoundV3CollateralSwap } from "../../typechain-types/contracts-exposed/CompoundV3CollateralSwap.sol/$CompoundV3CollateralSwap";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe.only("CompoundV3CollateralSwap", function () {
    let snapshot: SnapshotRestorer;

    // Contracts
    let collateralSwap: $CompoundV3CollateralSwap;
    let comet: IComet;

    // Tokens
    let weth: IERC20;
    let wstETH: IERC20;
    let rsETH: IERC20;
    let rETH: IERC20;

    let balancerPl: BalancerPlugin;
    let aavePl: AAVEPlugin;

    let aaveFLP;
    let balancerFLP;

    let alice: HardhatEthersSigner;

    let balancerPluginA: Plugin;
    let aavePluginA: Plugin;

    // Whales
    let wethWhale: HardhatEthersSigner;
    let wstETHWhale: HardhatEthersSigner;

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

        collateralSwap = await deployCollateralSwap([balancerPluginA, aavePluginA], SWAP_ROUTER);

        comet = await getComet();

        ({ weth, wstETH, rsETH, rETH } = await tokensInstances());

        ({ wethWhale, wstETHWhale } = await getWhales());

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("deployment", function () {
        it("deploys with correct params", async () => {
            const collateralSwap = await ethers.deployContract("CompoundV3CollateralSwap", [
                [balancerPluginA, aavePluginA],
                SWAP_ROUTER
            ]);

            // Check plugins
            const balancerSelector = await balancerPl.CALLBACK_SELECTOR();
            const aaveSelector = await aavePl.CALLBACK_SELECTOR();

            const balancerPluginInfo = await collateralSwap.plugins(balancerSelector);
            expect(balancerPluginInfo.endpoint).to.equal(balancerPluginA.endpoint);
            expect(balancerPluginInfo.flp).to.equal(balancerPluginA.flp);

            const aavePluginInfo = await collateralSwap.plugins(aaveSelector);
            expect(aavePluginInfo.endpoint).to.equal(aavePluginA.endpoint);
            expect(aavePluginInfo.flp).to.equal(aavePluginA.flp);

            // Check swap router
            expect(await collateralSwap.swapRouter()).to.equal(SWAP_ROUTER);
        });

        it("emits an event on deployment", async () => {
            // First get selectors
            const balancerSelector = await balancerPl.CALLBACK_SELECTOR();
            const aaveSelector = await aavePl.CALLBACK_SELECTOR();

            expect(
                await ethers.deployContract("CompoundV3CollateralSwap", [[balancerPluginA, aavePluginA], SWAP_ROUTER])
            )
                .to.emit(collateralSwap, "PluginRegistered")
                .withArgs(balancerSelector, balancerPluginA.endpoint, balancerPluginA.flp)
                .to.emit(collateralSwap, "PluginRegistered")
                .withArgs(aaveSelector, aavePluginA.endpoint, aavePluginA.flp);
        });

        it("reverts when deploying with zero address swap router", async () => {
            await expect(
                ethers.deployContract("CompoundV3CollateralSwap", [[balancerPluginA, aavePluginA], ethers.ZeroAddress])
            ).to.be.revertedWithCustomError(collateralSwap, "ZeroAddress");
        });

        it("reverts when deploying with empty plugins array", async () => {
            await expect(
                ethers.deployContract("CompoundV3CollateralSwap", [[], SWAP_ROUTER])
            ).to.be.revertedWithCustomError(collateralSwap, "ZeroLength");
        });
    });

    it.only("test swap", async function () {
        const supplyAmount = exp(1.5, 18);

        // supply and borrow on comet
        await wstETH.connect(wstETHWhale).approve(comet, supplyAmount);
        await comet.connect(wstETHWhale).supply(wstETH, supplyAmount);
    });

    describe("receive function", function () {
        it("reverts when sending ETH directly", async () => {
            await expect(
                alice.sendTransaction({
                    to: collateralSwap,
                    value: 1 // 1 wei
                })
            ).to.be.revertedWith("Cannot receive ETH");
        });
    });
});
