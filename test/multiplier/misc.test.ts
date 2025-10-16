import { ethers } from "hardhat";
import { expect } from "chai";
import { CometMultiplier, OneInchV6SwapPlugin, IComet, IERC20, FakeFlashLoanPlugin } from "../../typechain-types";
import { get1inchSwapData, calculateLeveragedAmount } from "../helpers/helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";
const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";
const USDC_WHALE = "0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055";

const opts = { maxFeePerGas: 4_000_000_000 };

describe("Comet Multiplier Adapter / Misc", function () {
    let adapter: CometMultiplier;
    let loanPlugin: FakeFlashLoanPlugin;
    let swapPlugin: OneInchV6SwapPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let user2: SignerWithAddress;
    let initialSnapshot: any;
    let whale2: SignerWithAddress;

    async function getMarketOptions(_loanPlugin?: string, _swapPlugin?: string) {
        return {
            comet: COMET_USDC_MARKET,
            loanPlugin: _loanPlugin ?? (await loanPlugin.getAddress()),
            swapPlugin: _swapPlugin ?? (await swapPlugin.getAddress()),
            flp: USDC_EVAULT
        };
    }

    before(async function () {
        await ethers.provider.send("hardhat_reset", [
            {
                forking: { jsonRpcUrl: process.env.FORKING_URL! }
            }
        ]);

        [owner, user, user2] = await ethers.getSigners();

        const LoanFactory = await ethers.getContractFactory("FakeFlashLoanPlugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);

        const SwapFactory = await ethers.getContractFactory("OneInchV6SwapPlugin", owner);
        swapPlugin = await SwapFactory.deploy(opts);

        const plugins = [
            {
                endpoint: await loanPlugin.getAddress(),
                config: "0x"
            },
            {
                endpoint: await swapPlugin.getAddress(),
                config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6])
            }
        ];

        const Adapter = await ethers.getContractFactory("CometMultiplier", owner);

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        adapter = await Adapter.deploy(plugins, await weth.getAddress(), opts);

        const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
        whale2 = await ethers.getImpersonatedSigner(USDC_WHALE);
        await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);
        await ethers.provider.send("hardhat_setBalance", [whale2.address, "0xffffffffffffffffffffff"]);
        await weth.connect(whale).transfer(user.address, ethers.parseEther("20"), opts);
        await weth.connect(whale).transfer(user2.address, ethers.parseEther("20"), opts);
        await usdc.connect(whale2).transfer(user.address, ethers.parseEther("0.0000001"), opts);

        const allowAbi = ["function allow(address, bool)"];
        const cometAsUser = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user);
        const cometAsUser2 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user2);
        await cometAsUser.allow(await adapter.getAddress(), true);
        await cometAsUser2.allow(await adapter.getAddress(), true);

        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    beforeEach(async function () {
        await ethers.provider.send("evm_revert", [initialSnapshot]);
        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    describe("Fallback", function () {
        it("Should revert on unknown function", async function () {
            const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [123]);
            await expect(owner.sendTransaction({ to: await adapter.getAddress(), data })).to.be.revertedWithCustomError(
                adapter,
                "UnknownPlugin"
            );
        });
    });

    describe("Execute Multiplier", function () {
        it("Should revert if wrong loan plugin selector", async function () {
            const comet = await getMarketOptions("0x0000000000000000000000000000000000000001");

            await weth.connect(user).approve(await adapter.getAddress(), ethers.parseEther("1"));

            await expect(
                adapter.connect(user).executeMultiplier(comet, WETH_ADDRESS, ethers.parseEther("1"), 20000, "0x")
            ).to.be.revertedWithCustomError(adapter, "UnknownPlugin");
        });

        it("Should revert if wrong swap plugin selector", async function () {
            const comet = await getMarketOptions(undefined, "0x0000000000000000000000000000000000000001");

            await weth.connect(user).approve(await adapter.getAddress(), ethers.parseEther("1"));
            await usdc.connect(whale2).approve(await adapter.getAddress(), ethers.parseEther("0.0000001"));
            await expect(
                adapter.connect(user).executeMultiplier(comet, WETH_ADDRESS, ethers.parseEther("1"), 20000, "0x")
            ).to.be.revertedWithCustomError(adapter, "UnknownPlugin");
        });

        it("Should revert if amount out is less the debt amount returned by loan plugin", async function () {
            const comet = await getMarketOptions();

            await weth.connect(user2).approve(await adapter.getAddress(), ethers.parseEther("20"));

            await expect(
                adapter.connect(user2).executeMultiplier(comet, WETH_ADDRESS, ethers.parseEther("1"), 20000, "0x")
            ).to.be.revertedWithCustomError(adapter, "InvalidAmountOut");
        });

        it("Use fake swap plugin for invalid amount out", async function () {
            const FakeSwapFactory = await ethers.getContractFactory("FakeSwapPlugin", owner);
            const EulerFactory = await ethers.getContractFactory("EulerV2Plugin", owner);
            const eulerPlugin = await EulerFactory.deploy(opts);
            const fakeSwapPlugin = await FakeSwapFactory.deploy(opts);

            const market0 = await getMarketOptions(await eulerPlugin.getAddress(), await swapPlugin.getAddress());
            const market1 = await getMarketOptions(await eulerPlugin.getAddress(), await fakeSwapPlugin.getAddress());

            const plugins = [
                {
                    endpoint: await eulerPlugin.getAddress(),
                    config: "0x"
                },
                {
                    endpoint: await swapPlugin.getAddress(),
                    config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6])
                },
                {
                    endpoint: await fakeSwapPlugin.getAddress(),
                    config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6])
                }
            ];

            const Adapter = await ethers.getContractFactory("CometMultiplier", owner);
            const adapter2 = await Adapter.deploy(plugins, await weth.getAddress(), opts);

            await weth.connect(user2).approve(await adapter2.getAddress(), ethers.parseEther("20"));

            const allowAbi = ["function allow(address, bool)"];
            const cometAsUser2 = new ethers.Contract(COMET_USDC_MARKET, allowAbi, user2);
            await cometAsUser2.allow(await adapter2.getAddress(), true);
            const baseAmount = await calculateLeveragedAmount(comet, ethers.parseEther("0.1"), 15000);
            const swapForOpen = await get1inchSwapData(
                USDC_ADDRESS,
                WETH_ADDRESS,
                baseAmount.toString(),
                await adapter2.getAddress()
            );
            await adapter2
                .connect(user2)
                .executeMultiplier(market0, WETH_ADDRESS, ethers.parseEther("0.1"), 15000, swapForOpen);

            await expect(
                adapter2.connect(user2).withdrawMultiplier(market1, WETH_ADDRESS, ethers.parseEther("0.01"), "0x")
            ).to.be.revertedWithCustomError(adapter2, "InvalidAmountOut");
        });

        it("should revert when plugin has invalid selector (bytes4(0))", async function () {
            const FakeInvalidPlugin = await ethers.getContractFactory("FakeInvalidPlugin", owner);
            const invalidPlugin = await FakeInvalidPlugin.deploy(opts);

            const plugins = [
                {
                    endpoint: await invalidPlugin.getAddress(),
                    config: "0x"
                }
            ];

            const Adapter = await ethers.getContractFactory("CometMultiplier", owner);

            await expect(Adapter.deploy(plugins, await weth.getAddress(), opts)).to.be.revertedWithCustomError(
                Adapter,
                "UnknownPlugin"
            );
        });

        it("Should revert if invalid weth address", async function () {
            const plugins = [
                {
                    endpoint: await loanPlugin.getAddress(),
                    config: "0x"
                },
                {
                    endpoint: await swapPlugin.getAddress(),
                    config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6])
                }
            ];

            const Adapter = await ethers.getContractFactory("CometMultiplier", owner);

            await expect(Adapter.deploy(plugins, ethers.ZeroAddress, opts)).to.be.revertedWithCustomError(
                Adapter,
                "InvalidWeth"
            );
        });
    });
});
