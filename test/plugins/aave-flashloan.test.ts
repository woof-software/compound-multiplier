import type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { AAVEPlugin, FlashloanPluginTest, ICometFlashLoanPlugin, IERC20 } from "../../typechain-types";
import { exp, getPlugins, getWhales, tokensInstances, ethers } from "../helpers/helpers";

describe("AAVE Flash Loan Plugin", function () {
    let snapshot: SnapshotRestorer;

    // Signers
    let alice: HardhatEthersSigner;

    // Contracts
    let plugin: AAVEPlugin;
    let flash: FlashloanPluginTest;
    let usdc: IERC20;

    // Constants
    const debt = exp(1000, 6);
    const premium = (debt * 5n) / 10_000n;

    let flp: string;
    let data: ICometFlashLoanPlugin.CallbackDataStruct;

    before(async () => {
        [alice] = await ethers.getSigners();

        const { aavePlugin } = await getPlugins();
        plugin = aavePlugin.endpoint;
        flp = aavePlugin.flp;

        ({ usdc } = await tokensInstances());

        const { usdcWhale } = await getWhales();
        await usdc.connect(usdcWhale).transfer(alice, exp(10000, 6));

        flash = await ethers.deployContract("FlashloanPluginTest", [aavePlugin.flp, aavePlugin.endpoint]);

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
            // in case of error on AAVE side thus we check lastCallbackData
            const lastCallbackDataBefore = await flash.lastCallbackData();
            expect(lastCallbackDataBefore.debt).to.be.equal(0);
            expect(lastCallbackDataBefore.fee).to.be.equal(0);
            expect(lastCallbackDataBefore.user).to.be.equal(ethers.ZeroAddress);
            expect(lastCallbackDataBefore.flp).to.be.equal(ethers.ZeroAddress);
            expect(lastCallbackDataBefore.asset).to.be.equal(ethers.ZeroAddress);
            expect(lastCallbackDataBefore.swapData).to.be.equal("0x");

            await usdc.connect(alice).transfer(flash, premium);

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
            await usdc.connect(alice).transfer(flash, premium);

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
            await expect(
                flash.connect(alice).attackAAVE(data, data.asset, data.debt, premium, flash.target, true)
            ).to.be.revertedWithCustomError(plugin, "InvalidFlashLoanId");
        });

        it("reverts when callback caller is not authorized", async () => {
            data.flp = flp;
            expect(data.flp).to.not.be.eq(alice);

            await expect(
                flash.connect(alice).attackAAVE(data, data.asset, data.debt, premium, flash.target, false)
            ).to.be.revertedWithCustomError(plugin, "UnauthorizedCallback");
        });

        it("reverts when data.debt != amount", async () => {
            await expect(
                flash.connect(alice).attackAAVE(
                    data,
                    data.asset,
                    debt + 1n, // wrong debt
                    premium,
                    flash.target,
                    false
                )
            ).to.be.revertedWithCustomError(plugin, "InvalidFlashLoanData");
        });

        it("reverts when data.asset != asset", async () => {
            await expect(
                flash.connect(alice).attackAAVE(
                    data,
                    alice, // wrong asset
                    debt,
                    premium,
                    flash.target,
                    false
                )
            ).to.be.revertedWithCustomError(plugin, "InvalidFlashLoanData");
        });

        it("reverts when initiator != address(this)", async () => {
            await expect(
                flash.connect(alice).attackAAVE(
                    data,
                    data.asset,
                    debt,
                    premium,
                    alice, // wrong initiator
                    false
                )
            ).to.be.revertedWithCustomError(plugin, "InvalidFlashLoanData");
        });
    });

    describe("plugin constants", function () {
        it("has correct CALLBACK_SELECTOR", async () => {
            const expectedSelector = plugin.interface.getFunction("executeOperation").selector;
            expect(await plugin.CALLBACK_SELECTOR()).to.be.equal(expectedSelector);
        });

        it("has correct SLOT_PLUGIN", async () => {
            const expectedSlot = ethers.keccak256(ethers.toUtf8Bytes("AAVEPlugin.plugin"));
            const adjustedSlot = ethers.toBigInt(expectedSlot) - 1n;
            const finalSlot = ethers.toBeHex(adjustedSlot, 32);

            expect(await plugin.SLOT_PLUGIN()).to.be.equal(finalSlot);
        });
    });
});
