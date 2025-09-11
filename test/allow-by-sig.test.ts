import { ethers } from "hardhat";
import { $CompoundV3CollateralSwap } from "../typechain-types/contracts-exposed/CompoundV3CollateralSwap.sol/$CompoundV3CollateralSwap";

import {
    impersonateAccount,
    setBalance,
    SnapshotRestorer,
    takeSnapshot,
    time
} from "@nomicfoundation/hardhat-network-helpers";

import { AllowBySig, BalancerPlugin, CompoundV3CollateralSwap, IComet, IERC20 } from "../typechain-types";
import { exp } from "./helpers/helpers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Addressable } from "ethers";

describe("Allow By Signature", function () {
    let snapshot: SnapshotRestorer;

    // Signers
    let deployer: HardhatEthersSigner;
    let alice: HardhatEthersSigner;
    let attacker: HardhatEthersSigner;

    // Contracts
    let collateralSwap: $CompoundV3CollateralSwap;
    let comet: IComet;

    // Mainnet data
    const FLP_BALANCER = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    const SWAP_ROUTER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";
    const COMET = "0xA17581A9E3356d9A858b789D68B4d866e593aE94";

    const types = {
        Authorization: [
            { name: "owner", type: "address" },
            { name: "manager", type: "address" },
            { name: "isAllowed", type: "bool" },
            { name: "nonce", type: "uint256" },
            { name: "expiry", type: "uint256" }
        ]
    };

    let domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: string;
    };

    let allowParams: {
        nonce: bigint;
        expiry: bigint;
        r: string;
        s: string;
        owner: string;
        isAllowed: boolean;
        manager: string | Addressable;
        v: number;
    };

    before(async () => {
        [deployer, alice, attacker] = await ethers.getSigners();

        const balancerFlashLoan = await ethers.deployContract("BalancerPlugin", [], deployer);
        const balancerPlugin = {
            flp: FLP_BALANCER,
            endpoint: balancerFlashLoan.target
        };

        collateralSwap = (await ethers.deployContract(
            "$CompoundV3CollateralSwap",
            [[balancerPlugin], SWAP_ROUTER],
            deployer
        )) as unknown as $CompoundV3CollateralSwap;

        comet = await ethers.getContractAt("IComet", COMET);

        domain = {
            name: await comet.name(),
            version: await comet.version(),
            chainId: 31337,
            verifyingContract: comet.target.toString()
        };

        const signatureArgs = {
            owner: alice.address,
            manager: collateralSwap.target.toString(),
            isAllowed: true,
            nonce: await comet.userNonce(alice),
            expiry: (await time.latest()) + 100
        };

        const sig = await alice.signTypedData(domain, types, signatureArgs);
        const splitSig = ethers.Signature.from(sig);

        allowParams = {
            nonce: signatureArgs.nonce,
            expiry: BigInt(signatureArgs.expiry),
            r: splitSig.r,
            s: splitSig.s,
            v: splitSig.v,
            owner: signatureArgs.owner,
            isAllowed: signatureArgs.isAllowed,
            manager: signatureArgs.manager
        };

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    it("allows to give permission via signature on comet on behalf of user", async () => {
        // Check that the permission is not set
        expect(await comet.hasPermission(alice.address, collateralSwap.target)).to.be.false;

        await collateralSwap.connect(alice).$_allowBySig(allowParams, comet);

        // Check that the permission is set
        expect(await comet.hasPermission(alice.address, collateralSwap.target)).to.be.true;
    });

    it("reverts if manager is not contract address", async () => {
        // Use a different manager address
        const badParams = { ...allowParams, manager: attacker.address };
        await expect(collateralSwap.connect(alice).$_allowBySig(badParams, comet)).to.be.revertedWithCustomError(
            collateralSwap,
            "InvalidManager"
        );
    });

    it("reverts if owner is not msg.sender", async () => {
        // Call from deployer, but owner is alice
        await expect(collateralSwap.connect(deployer).$_allowBySig(allowParams, comet)).to.be.revertedWithCustomError(
            collateralSwap,
            "InvalidOwner"
        );
    });

    it("reverts if isAllowed is false", async () => {
        // Set isAllowed to false
        const badParams = { ...allowParams, isAllowed: false };
        await expect(collateralSwap.connect(alice).$_allowBySig(badParams, comet)).to.be.revertedWithCustomError(
            collateralSwap,
            "InvalidAllowedType"
        );
    });
});
