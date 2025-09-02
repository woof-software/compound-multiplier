import type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
import { takeSnapshot, impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { AAVEPlugin, BalancerPlugin, CompoundV3CollateralSwap, IERC20 } from "../typechain-types";

describe.only("AAVE Flash loan", function () {
    let snapshot: SnapshotRestorer;

    // Signers.
    let deployer: HardhatEthersSigner;
    let user: HardhatEthersSigner;

    // Contracts.
    let aavePlugin: AAVEPlugin;
    let collateralSwapper: CompoundV3CollateralSwap;
    let usdc: IERC20;

    // Mainnet data
    const POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const USDC_WHALE = "0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055";

    const exp = ethers.parseUnits;

    before(async () => {
        [deployer, user] = await ethers.getSigners();

        aavePlugin = await ethers.deployContract("AAVEPlugin", [], deployer);
        collateralSwapper = await ethers.deployContract("CompoundV3CollateralSwap", [aavePlugin, POOL], deployer);

        usdc = await ethers.getContractAt("IERC20", USDC, user);

        await setBalance(USDC_WHALE, exp("1000", 18));
        await impersonateAccount(USDC_WHALE);
        const usdcWhale = await ethers.getSigner(USDC_WHALE);

        await usdc.connect(usdcWhale).transfer(user, exp("1000000", 6));

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    it("should allow to take a flashloan using aave", async function () {
        const swapParams: CompoundV3CollateralSwap.SwapParamsStruct = {
            user: user.address,
            comet: "0x0000000000000000000000000000000000000000",
            callbackSelector: await aavePlugin.CALLBACK_SELECTOR(),
            fromAssets: [],
            fromAmounts: [],
            flashLoanAmounts: [exp("1000", 6)],
            toAssets: [usdc.target],
            swapCalldata: [ethers.hexlify("0x")], // 0x in bytes
            minAmountsOut: [0],
            maxHealthFactorDropBps: 0,
            supplementalAssets: [],
            supplementalAmounts: []
        };

        const premium = 500000;
        await usdc.connect(user).transfer(collateralSwapper, premium);

        await collateralSwapper.connect(user).swap(swapParams);

        console.log(await aavePlugin.CALLBACK_SELECTOR());
    });
});
