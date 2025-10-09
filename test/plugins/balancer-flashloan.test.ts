import type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BalancerPlugin, FlashloanPluginTest, ICometFlashLoanPlugin, IERC20 } from "../../typechain-types";
import { exp, getPlugins, getWhales, tokensInstances, ethers, BALANCER_VAULT } from "../helpers/helpers";

describe("Balancer Flash Loan Plugin", function () {
    let snapshot: SnapshotRestorer;

    // Signers
    let alice: HardhatEthersSigner;

    // Contracts
    let plugin: BalancerPlugin;
    let flash: FlashloanPluginTest;
    let usdc: IERC20;

    // Constants
    const debt = exp(1000, 6);
    // Balancer has 0% flash loan fee
    const premium = 0n;

    let flp: string;
    let data: ICometFlashLoanPlugin.CallbackDataStruct;

    before(async () => {
        [alice] = await ethers.getSigners();

        const { balancerPlugin } = await getPlugins();
        plugin = balancerPlugin.endpoint;
        flp = BALANCER_VAULT;

        ({ usdc } = await tokensInstances());

        const { usdcWhale } = await getWhales();
        await usdc.connect(usdcWhale).transfer(alice, exp(10000, 6));

        flash = await ethers.deployContract("FlashloanPluginTest", [BALANCER_VAULT, balancerPlugin.endpoint]);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("happy cases", function () {
        beforeEach(() => {
            data = {
                debt: debt,
                snapshot: 0,
                fee: 0,
                user: alice.address,
                flp: flp,
                asset: usdc.target,
                swapData: "0x"
            };
        });

        it("allows to take a flashloan and repay it", async () => {
            // As plugin is executed via delegatecall, tx will may not fail
            // in case of error on Balancer side thus we check lastCallbackData
            const lastCallbackDataBefore = await flash.lastCallbackData();
            expect(lastCallbackDataBefore.debt).to.be.equal(0);
            expect(lastCallbackDataBefore.fee).to.be.equal(0);
            expect(lastCallbackDataBefore.user).to.be.equal(ethers.ZeroAddress);
            expect(lastCallbackDataBefore.flp).to.be.equal(ethers.ZeroAddress);
            expect(lastCallbackDataBefore.asset).to.be.equal(ethers.ZeroAddress);
            expect(lastCallbackDataBefore.swapData).to.be.equal("0x");

            // Balancer has 0% flash loan fee, so no need to transfer premium
            await flash.connect(alice).flash(data);

            const lastCallbackDataAfter = await flash.lastCallbackData();
            expect(lastCallbackDataAfter.debt).to.be.equal(data.debt);
            expect(lastCallbackDataAfter.fee).to.be.equal(premium);
            expect(lastCallbackDataAfter.user).to.be.equal(data.user);
            expect(lastCallbackDataAfter.flp).to.be.equal(data.flp);
            expect(lastCallbackDataAfter.asset).to.be.equal(data.asset);
            expect(lastCallbackDataAfter.swapData).to.be.equal(data.swapData);
        });

        it('updates "flashLoanFee" in callback data', async () => {
            await flash.connect(alice).flash(data);

            const lastCallbackDataAfter = await flash.lastCallbackData();
            expect(lastCallbackDataAfter.fee).to.be.equal(premium);
        });
    });

    describe("revert cases", function () {
        beforeEach(() => {
            data = {
                debt: debt,
                snapshot: 0,
                fee: 0,
                user: alice,
                flp: alice,
                asset: usdc.target,
                swapData: "0x"
            };
        });

        it("reverts when flid is not valid", async () => {
            const tokens = [usdc.target];
            const amounts = [data.debt];
            const feeAmounts = [premium];

            await expect(
                flash.connect(alice).attackBalancer(data, tokens as any, amounts, feeAmounts, true)
            ).to.be.revertedWithCustomError(plugin, "InvalidFlashLoanId");
        });

        it("reverts when callback caller is not authorized", async () => {
            data.flp = flp;
            expect(data.flp).to.not.be.eq(alice);

            const tokens = [usdc.target];
            const amounts = [data.debt];
            const feeAmounts = [premium];

            await expect(
                flash.connect(alice).attackBalancer(data, tokens as any, amounts, feeAmounts, false)
            ).to.be.revertedWithCustomError(plugin, "UnauthorizedCallback");
        });

        it("reverts when data.debt != amounts[0]", async () => {
            const tokens = [usdc.target];
            const amounts = [debt + 1n]; // wrong debt amount
            const feeAmounts = [premium];

            await expect(
                flash.connect(alice).attackBalancer(data, tokens as any, amounts, feeAmounts, false)
            ).to.be.revertedWithCustomError(plugin, "InvalidFlashLoanData");
        });

        it("reverts when data.asset != tokens[0]", async () => {
            const tokens = [alice.address]; // wrong asset
            const amounts = [debt];
            const feeAmounts = [premium];

            await expect(
                flash.connect(alice).attackBalancer(data, tokens as any, amounts, feeAmounts, false)
            ).to.be.revertedWithCustomError(plugin, "InvalidFlashLoanData");
        });
    });

    describe("plugin constants", function () {
        it("has correct CALLBACK_SELECTOR", async () => {
            const expectedSelector = plugin.interface.getFunction("receiveFlashLoan").selector;
            expect(await plugin.CALLBACK_SELECTOR()).to.be.equal(expectedSelector);
        });

        it("has correct SLOT_PLUGIN", async () => {
            const expectedSlot = ethers.keccak256(ethers.toUtf8Bytes("BalancerPlugin.plugin"));
            const adjustedSlot = ethers.toBigInt(expectedSlot) - 1n;
            const finalSlot = ethers.toBeHex(adjustedSlot, 32);

            expect(await plugin.SLOT_PLUGIN()).to.be.equal(finalSlot);
        });
    });
});
