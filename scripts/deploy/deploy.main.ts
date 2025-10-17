import { ethers, network } from "hardhat";
import { deployConfig } from "./deploy.config";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../utils/verify";

function encodePluginConfig(address: string): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(["address"], [address]);
}

function encodeUniswapV3Config(pools: { token: string; pool: string }[]): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(["tuple(address token, address pool)[]"], [pools]);
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = network.name;

    console.log("Network:", networkName);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    const config = deployConfig[networkName];
    if (!config) {
        throw new Error(`No config for network: ${networkName}`);
    }

    const deploymentFile = path.join(__dirname, "..", "..", "deployments", `${networkName}.json`);
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Plugins not deployed. Run deploy.plugins.ts first. Missing file: ${deploymentFile}`);
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    if (!deploymentData.loanPlugins || !deploymentData.swapPlugins) {
        throw new Error("Plugins data not found in deployment file");
    }

    const gasPrice = network.config.gasPrice;
    const opts = gasPrice ? { gasPrice } : {};

    const pluginArray = [];

    if (deploymentData.loanPlugins.morpho) {
        const morphoConfig = encodePluginConfig(config.plugins.loanPlugins.morpho);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.morpho.endpoint,
            config: morphoConfig
        });
        console.log("Added Morpho plugin:", deploymentData.loanPlugins.morpho.endpoint);
    }

    if (deploymentData.loanPlugins.euler) {
        const eulerConfig = encodePluginConfig(config.plugins.loanPlugins.euler);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.euler.endpoint,
            config: eulerConfig
        });
        console.log("Added Euler V2 plugin:", deploymentData.loanPlugins.euler.endpoint);
    }

    if (deploymentData.loanPlugins.uniswapV3) {
        if (!config.plugins.loanPlugins.uniswapV3Pools || config.plugins.loanPlugins.uniswapV3Pools.length === 0) {
            throw new Error("UniswapV3 pools configuration is required in deploy.config.ts");
        }

        const uniswapV3Config = encodeUniswapV3Config(config.plugins.loanPlugins.uniswapV3Pools);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.uniswapV3.endpoint,
            config: uniswapV3Config
        });
        console.log("Added Uniswap V3 plugin:", deploymentData.loanPlugins.uniswapV3.endpoint);
        console.log("Pools configured:", config.plugins.loanPlugins.uniswapV3Pools.length);
    }

    if (deploymentData.loanPlugins.aave) {
        const aaveConfig = encodePluginConfig(config.plugins.loanPlugins.aave);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.aave.endpoint,
            config: aaveConfig
        });
        console.log("Added AAVE plugin:", deploymentData.loanPlugins.aave.endpoint);
    }

    if (deploymentData.loanPlugins.balancer) {
        const balancerConfig = encodePluginConfig(config.plugins.loanPlugins.balancer);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.balancer.endpoint,
            config: balancerConfig
        });
        console.log("Added Balancer plugin:", deploymentData.loanPlugins.balancer.endpoint);
    }

    if (deploymentData.swapPlugins.lifi) {
        const lifiConfig = encodePluginConfig(config.plugins.swapPlugins.lifi);
        pluginArray.push({
            endpoint: deploymentData.swapPlugins.lifi.endpoint,
            config: lifiConfig
        });
        console.log("Added LiFi plugin:", deploymentData.swapPlugins.lifi.endpoint);
    }

    if (deploymentData.swapPlugins.oneInch) {
        const oneInchConfig = encodePluginConfig(config.plugins.swapPlugins.oneInch);
        pluginArray.push({
            endpoint: deploymentData.swapPlugins.oneInch.endpoint,
            config: oneInchConfig
        });
        console.log("Added 1inch plugin:", deploymentData.swapPlugins.oneInch.endpoint);
    }

    if (deploymentData.swapPlugins.wsteth) {
        pluginArray.push({
            endpoint: deploymentData.swapPlugins.wsteth.endpoint,
            config: "0x"
        });
        console.log("Added WstETH plugin:", deploymentData.swapPlugins.wsteth.endpoint);
    }

    console.log(`Deploying CometFoundation with ${pluginArray.length} plugins...`);

    const Adapter = await ethers.getContractFactory("CometFoundation");
    const adapter = await Adapter.deploy(pluginArray, config.weth, opts);
    await adapter.waitForDeployment();

    const adapterAddress = await adapter.getAddress();

    console.log("\nCometFoundation deployed:", adapterAddress);

    console.log("\nVerifying contract on Etherscan...");
    try {
        await verify(adapterAddress, [pluginArray, config.weth]);
        console.log("Contract verified");
    } catch (error) {
        console.warn("Verification failed:", error);
    }
    deploymentData.CometFoundation = adapterAddress;
    deploymentData.foundationDeployedAt = new Date().toISOString();
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("Deployment file:", deploymentFile);
    console.log("Deployment completed.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nDeployment failed:");
        console.error(error);
        process.exit(1);
    });
