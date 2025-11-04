import hre, { ethers, network } from "hardhat";
import { expect } from "chai";
import { deployConfig } from "../../scripts/deploy/deploy.config";
import { COMETS, envs, Network } from "../../scripts/deploy/deploy.constant";
import { CometFoundation, IComet, IERC20 } from "../../typechain-types";
import {
    calculateHealthFactor,
    calculateMaxLeverage,
    calculateLeveragedAmount,
    calculateExpectedCollateral,
    executeWithRetry,
    getQuote,
    get1inchSwapData,
    USDC_ADDRESS
} from "../helpers/helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import * as fs from "fs";

let NETWORK_CONFIG: any;
let WETH_ADDRESS: string;
let BASE_TOKEN_ADDRESS: string;
let COMET_MARKET: string;

const opts = { maxFeePerGas: 4_000_000_000 };

// if (!process.env.RUN_SCENARIO) {
//     console.log("Scenario skipped (RUN_SCENARIO not set). Run via deploy.sh only.");
//     process.exit(0);
// }

const networkName = process.env.FORK_NETWORK!;
let id = hre.config.networks[networkName]?.chainId!;
const deploymentPath = `./deployments/${networkName}.json`;
const config = deployConfig[networkName];
if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
}

const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const networkEnum = Network[(networkName.charAt(0).toUpperCase() + networkName.slice(1)) as keyof typeof Network];
NETWORK_CONFIG = envs(networkEnum);

if (!NETWORK_CONFIG) {
    console.log(`No network constants for ${networkName}. Skipping tests.`);
    process.exit(0);
}

WETH_ADDRESS = NETWORK_CONFIG.tokens.WETH;
BASE_TOKEN_ADDRESS = NETWORK_CONFIG.tokens.USDC;
COMET_MARKET = COMETS.get(networkEnum)!;

const loanPlugins = Object.keys(deploymentData.loanPlugins || {});
const swapPlugins = Object.keys(deploymentData.swapPlugins || {});

const testConfigs: Array<{ loanPlugin: string; swapPlugin: string; description: string }> = [];

for (const loanPlugin of loanPlugins) {
    for (const swapPlugin of swapPlugins) {
        if (
            !(loanPlugin in (config.plugins?.loanPlugins || {})) &&
            loanPlugin !== "uniswapV3" &&
            loanPlugin !== "uniswapV4"
        ) {
            continue;
        }
        if (!(swapPlugin in (config.plugins?.swapPlugins || {}))) {
            continue;
        }
        testConfigs.push({
            loanPlugin,
            swapPlugin,
            description: `${loanPlugin} + ${swapPlugin}`
        });
    }
}

describe.skip("Universal Comet Multiplier Tests", function () {
    let adapter: CometFoundation;
    let comet: IComet;
    let weth: IERC20;
    let baseToken: IERC20;
    let user: SignerWithAddress;
    let treasury: SignerWithAddress;
    let initialSnapshot: any;

    before(async function () {
        [user, treasury] = await ethers.getSigners();

        adapter = await ethers.getContractAt("CometFoundation", deploymentData.CometFoundation);
        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        baseToken = await ethers.getContractAt("IERC20", BASE_TOKEN_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_MARKET);

        await fundUser(user.address, networkName);

        console.log(COMET_MARKET, BASE_TOKEN_ADDRESS, WETH_ADDRESS);
        const allowAbi = ["function allow(address, bool)"];
        const cometAsUser = new ethers.Contract(COMET_MARKET, allowAbi, user);
        await cometAsUser.allow(await adapter.getAddress(), true);

        initialSnapshot = await ethers.provider.send("evm_snapshot");
    });

    for (const { loanPlugin, swapPlugin, description } of testConfigs) {
        describe(`Plugin Combination: ${description}`, function () {
            let market: any;

            before(async function () {
                const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
                market = {
                    comet: COMET_MARKET,
                    loanPlugin: deploymentData.loanPlugins[loanPlugin]?.endpoint,
                    swapPlugin: deploymentData.swapPlugins[swapPlugin]?.endpoint
                };
                if (!market.loanPlugin || !market.swapPlugin) {
                    throw new Error(`Missing plugin endpoints for ${description}`);
                }
            });

            beforeEach(async function () {
                await ethers.provider.send("evm_revert", [initialSnapshot]);
                initialSnapshot = await ethers.provider.send("evm_snapshot");
            });

            it("should execute multiply with 2x leverage", async function () {
                const initialAmount = ethers.parseEther("0.1");
                const leverage = 20_000;
                const expectedDebt = await calculateLeveragedAmount(comet, initialAmount, leverage, WETH_ADDRESS);
                const expectedCollateral = await calculateExpectedCollateral(initialAmount, leverage);
                await multiply(weth, market, comet, adapter, user, initialAmount, leverage, swapPlugin, id);
                const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const borrowBalance = await comet.borrowBalanceOf(user.address);
                expect(collateralBalance).to.be.closeTo(expectedCollateral, expectedCollateral / 50n);
                expect(borrowBalance).to.be.closeTo(expectedDebt, expectedDebt / 20n);
                expect(collateralBalance).to.be.gt(initialAmount);
                expect(borrowBalance).to.be.gt(0);
            });

            it("should execute multipl y with max leverage", async function () {
                const initialAmount = ethers.parseEther("0.05");
                const maxLeverage = await calculateMaxLeverage(comet, WETH_ADDRESS);
                await multiply(weth, market, comet, adapter, user, initialAmount, maxLeverage, swapPlugin, id);
                const collateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const borrowBalance = await comet.borrowBalanceOf(user.address);
                const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);
                expect(healthFactor).to.be.gt(borrowBalance);
                expect(collateralBalance).to.be.gt(initialAmount);
            });

            it("should cover half of position", async function () {
                const initialAmount = ethers.parseEther("0.2");
                const leverage = 20_000;
                await multiply(weth, market, comet, adapter, user, initialAmount, leverage, swapPlugin, id);
                const initialCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const initialDebt = await comet.borrowBalanceOf(user.address);
                const initialBaseToken = await baseToken.balanceOf(user.address);
                const collateralToWithdraw = initialCol / 2n;
                await cover(market, adapter, user, collateralToWithdraw, swapPlugin, id);
                const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const finalDebt = await comet.borrowBalanceOf(user.address);
                const finalBaseToken = await baseToken.balanceOf(user.address);
                const healthFactor = await calculateHealthFactor(comet, user.address, WETH_ADDRESS);
                expect(finalCol).to.be.closeTo(initialCol / 2n, ethers.parseEther("0.01"));
                expect(finalDebt).to.be.lt(initialDebt);
                expect(finalBaseToken).to.be.gt(initialBaseToken);
                expect(healthFactor).to.be.gt(finalDebt);
            });

            it("should close entire position", async function () {
                const initialAmount = ethers.parseEther("0.1");
                const leverage = 15_000;
                await multiply(weth, market, comet, adapter, user, initialAmount, leverage, swapPlugin, id);
                const initialBaseToken = await baseToken.balanceOf(user.address);
                await cover(market, adapter, user, ethers.MaxUint256, swapPlugin, id);
                const finalDebt = await comet.borrowBalanceOf(user.address);
                const finalCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
                const finalBaseToken = await baseToken.balanceOf(user.address);
                expect(finalDebt).to.be.eq(0n);
                expect(finalCol).to.be.eq(0n);
                expect(finalBaseToken).to.be.gt(initialBaseToken);
            });
        });

        break;
    }
});

async function fundUser(userAddress: string, networkName: string) {
    const fundingAmount = ethers.parseEther("10");
    await ethers.provider.send("hardhat_setBalance", [userAddress, "0xffffffffffffffffffffffff"]);
    const weth = await ethers.getContractAt("IWEth", WETH_ADDRESS);
    const signer = await ethers.getSigner(userAddress);
    await weth.connect(signer).deposit({ value: fundingAmount });
}

async function multiply(
    weth: IERC20,
    market: any,
    comet: IComet,
    adapter: CometFoundation,
    signer: SignerWithAddress,
    collateralAmount: bigint,
    leverage: number,
    swapPlugin: string,
    chainId: number
) {
    await weth.connect(signer).approve(await adapter.getAddress(), collateralAmount);
    const baseAmount = await calculateLeveragedAmount(comet, collateralAmount, leverage, WETH_ADDRESS);
    return await executeWithRetry(async () => {
        const swapData = await getSwapData(
            swapPlugin,
            BASE_TOKEN_ADDRESS,
            WETH_ADDRESS,
            baseAmount.toString(),
            await adapter.getAddress(),
            chainId
        );
        return adapter
            .connect(signer)
            [
                "multiply((address,address,address),address,uint256,uint256,bytes)"
            ](market, WETH_ADDRESS, collateralAmount, leverage, swapData, opts);
    });
}

async function cover(
    market: any,
    adapter: CometFoundation,
    signer: SignerWithAddress,
    requestedCollateral: bigint,
    swapPlugin: string,
    chainId: number
) {
    const comet = await ethers.getContractAt("IComet", market.comet);
    return await executeWithRetry(async () => {
        const swapData =
            requestedCollateral === 0n
                ? "0x"
                : await getSwapData(
                      swapPlugin,
                      WETH_ADDRESS,
                      BASE_TOKEN_ADDRESS,
                      requestedCollateral === ethers.MaxUint256
                          ? (await comet.collateralBalanceOf(await signer.getAddress(), WETH_ADDRESS)).toString()
                          : requestedCollateral.toString(),
                      await adapter.getAddress(),
                      chainId
                  );
        return adapter
            .connect(signer)
            [
                "cover((address,address,address),address,uint256,bytes)"
            ](market, WETH_ADDRESS, requestedCollateral, swapData, opts);
    });
}

async function getSwapData(
    swapPlugin: string,
    fromToken: string,
    toToken: string,
    amount: string,
    receiver: string,
    chainId: number
): Promise<string> {
    if (swapPlugin === "lifi") {
        return executeWithRetry(async () => {
            const quote = await getQuote(String(chainId), String(chainId), fromToken, toToken, amount, receiver);
            return quote.swapCalldata;
        });
    } else if (swapPlugin === "oneInch") {
        return executeWithRetry(async () => {
            return await get1inchSwapData(fromToken, toToken, amount, receiver);
        });
    } else if (swapPlugin === "wsteth") {
        return "0x";
    }
    throw new Error(`Unknown swap plugin: ${swapPlugin}`);
}
