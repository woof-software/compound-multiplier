import { ethers } from "hardhat";
import { expect } from "chai";
import { CometFoundation, EulerV2Plugin, IComet, IERC20, WstEthPlugin } from "../../../typechain-types";
import { executeWithRetry, getQuote, LIFI_ROUTER } from "../../helpers/helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { LiFiPlugin } from "../../../typechain-types";
import { BytesLike } from "ethers";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const STETH_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
const WSTETH_ADDRESS = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
const COMET_WETH_MARKET = "0xA17581A9E3356d9A858b789D68B4d866e593aE94";
const WETH_EVAULT = process.env.WETH_EVAULT ?? "0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2";

const WSTETH_WHALE = "0x0B925eD163218f6662a35e0f0371Ac234f9E9371";
const WETH_WHALE = "0x28a55C4b4f9615FDE3CDAdDf6cc01FcF2E38A6b0";

const opts = { maxFeePerGas: 4_000_000_000 };

describe("Comet Multiplier Adapter / LiFI / wstETH", function () {
    let adapter: CometFoundation;
    let loanPlugin: EulerV2Plugin;
    let swapPlugin: WstEthPlugin;
    let lifiPlugin: LiFiPlugin;

    let comet: IComet;
    let weth: IERC20;
    let wsteth: IERC20;

    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let initialSnapshot: any;

    async function getMarketOptions(isIn: boolean) {
        return {
            comet: COMET_WETH_MARKET,
            loanPlugin: await loanPlugin.getAddress(),
            swapPlugin: isIn ? await swapPlugin.getAddress() : await lifiPlugin.getAddress()
        };
    }

    async function multiply(signer: SignerWithAddress, collateralAmount: bigint, leverageBps: number) {
        await wsteth.connect(signer).approve(await adapter.getAddress(), collateralAmount);

        const market = await getMarketOptions(true);

        // @ts-ignore
        return adapter
            .connect(signer)
            [
                "multiply((address,address,address),address,uint256,uint256,bytes)"
            ](market, WSTETH_ADDRESS, collateralAmount, leverageBps, ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1]));
    }

    async function cover(signer: SignerWithAddress, collateralAmount: bigint, minAmountOut: bigint = 1n) {
        const market = await getMarketOptions(false);

        return executeWithRetry(async () => {
            const swapData = (
                await getQuote(
                    "1",
                    "1",
                    WSTETH_ADDRESS,
                    WETH_ADDRESS,
                    collateralAmount.toString(),
                    await adapter.getAddress()
                )
            ).swapCalldata;

            // @ts-ignore
            return adapter
                .connect(signer)
                [
                    "cover((address,address,address),address,uint256,bytes)"
                ](market, WSTETH_ADDRESS, collateralAmount, swapData);
        });
    }

    before(async function () {
        await ethers.provider.send("hardhat_reset", [
            {
                forking: { jsonRpcUrl: process.env.FORKING_URL! }
            }
        ]);

        [owner, user] = await ethers.getSigners();

        const LoanFactory = await ethers.getContractFactory("EulerV2Plugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);

        const LifiFactory = await ethers.getContractFactory("LiFiPlugin", owner);
        lifiPlugin = await LifiFactory.deploy(opts);

        const SwapFactory = await ethers.getContractFactory("WstEthPlugin", owner);
        swapPlugin = await SwapFactory.deploy(opts);

        const lifiCfg = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [LIFI_ROUTER]);
        const eulerCfg = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [WETH_EVAULT]);

        const plugins = [
            { endpoint: await loanPlugin.getAddress(), config: eulerCfg },
            { endpoint: await swapPlugin.getAddress(), config: "0x" },
            { endpoint: await lifiPlugin.getAddress(), config: lifiCfg }
        ];

        const Adapter = await ethers.getContractFactory("CometFoundation", owner);

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        wsteth = await ethers.getContractAt("IERC20", WSTETH_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_WETH_MARKET);

        adapter = await Adapter.deploy(plugins, await weth.getAddress(), opts);

        const wstethWhale = await ethers.getImpersonatedSigner(WSTETH_WHALE);
        await ethers.provider.send("hardhat_setBalance", [WSTETH_WHALE, "0xffffffffffffffffffffff"]);

        const fundAmount = ethers.parseEther("1.0");
        await wsteth.connect(wstethWhale).transfer(user.address, fundAmount);

        const allowAbi = ["function allow(address,bool)"];
        const cometAsUser = new ethers.Contract(COMET_WETH_MARKET, allowAbi, user);
        await cometAsUser.allow(await adapter.getAddress(), true);

        const userBalance = await wsteth.balanceOf(user.address);
        expect(userBalance).to.be.gt(0n);

        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    beforeEach(async function () {
        await ethers.provider.send("evm_revert", [initialSnapshot]);
        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    describe("Execute Multiplier", function () {
        it("should execute with 1.5x leverage", async function () {
            const collateralAmount = ethers.parseEther("0.5");
            const leverage = 15_000;

            const colBefore = await comet.collateralBalanceOf(user.address, WSTETH_ADDRESS);
            const debtBefore = await comet.borrowBalanceOf(user.address);

            await executeWithRetry(() => multiply(user, collateralAmount, leverage));

            const colAfter = await comet.collateralBalanceOf(user.address, WSTETH_ADDRESS);
            const debtAfter = await comet.borrowBalanceOf(user.address);

            expect(colAfter).to.be.gt(colBefore + collateralAmount);
            expect(debtAfter).to.be.gt(debtBefore);
        });

        it("should execute with 2x leverage", async function () {
            const collateralAmount = ethers.parseEther("0.1");
            const leverage = 20_000;

            await executeWithRetry(() => multiply(user, collateralAmount, leverage));

            const collateralBalance = await comet.collateralBalanceOf(user.address, WSTETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.gt(collateralAmount);
            expect(borrowBalance).to.be.gt(0);
        });

        it("should handle maximum user balance", async function () {
            const userBalance = await wsteth.balanceOf(user.address);
            const leverage = 15_000;

            await executeWithRetry(() => multiply(user, userBalance, leverage));

            const collateralBalance = await comet.collateralBalanceOf(user.address, WSTETH_ADDRESS);
            const borrowBalance = await comet.borrowBalanceOf(user.address);

            expect(collateralBalance).to.be.gt(userBalance);
            expect(borrowBalance).to.be.gt(0);
        });
    });

    describe("Withdraw Multiplier", function () {
        beforeEach(async function () {
            const collateralAmount = ethers.parseEther("0.2");
            const leverage = 20_000;
            await executeWithRetry(() => multiply(user, collateralAmount, leverage));
        });

        it("should partially reduce leverage", async function () {
            const initialDebt = await comet.borrowBalanceOf(user.address);
            const initialCol = await comet.collateralBalanceOf(user.address, WSTETH_ADDRESS);

            expect(initialDebt).to.be.gt(0n);
            expect(initialCol).to.be.gt(0n);
            const partialRepay = initialDebt / 4n;

            await executeWithRetry(() => cover(user, partialRepay));

            const finalDebt = await comet.borrowBalanceOf(user.address);
            const finalCol = await comet.collateralBalanceOf(user.address, WSTETH_ADDRESS);

            expect(finalDebt).to.be.lt(initialDebt);
            expect(finalCol).to.be.lt(initialCol);
        });

        it("should fully close position", async function () {
            await executeWithRetry(() => cover(user, ethers.MaxUint256));

            const finalDebt = await comet.borrowBalanceOf(user.address);
            expect(finalDebt).to.be.eq(0n);
        });
    });
});
