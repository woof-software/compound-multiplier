import { ethers, network } from "hardhat";
import { deployConfig } from "./deploy.config";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = network.name;

    console.log("\nDeploying to:", networkName);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    const config = deployConfig[networkName];
    if (!config) {
        throw new Error(`No config for network: ${networkName}`);
    }

    const gasPrice = network.config.gasPrice;
    const opts = gasPrice ? { gasPrice } : {};

    const deployed: Record<string, string> = {};
    const pluginArray = [];

    if (config.plugins.loanPlugins.morpho) {
        console.log("Deploying MorphoPlugin...");
        const Plugin = await ethers.getContractFactory("MorphoPlugin");
        const plugin = await Plugin.deploy(opts);
        await plugin.waitForDeployment();
        deployed.morphoPlugin = await plugin.getAddress();
        pluginArray.push({ endpoint: deployed.morphoPlugin, config: "0x" });
        console.log("  " + deployed.morphoPlugin);
    }

    if (config.plugins.loanPlugins.euler) {
        console.log("Deploying EulerV2Plugin...");
        const Plugin = await ethers.getContractFactory("EulerV2Plugin");
        const plugin = await Plugin.deploy(opts);
        await plugin.waitForDeployment();
        deployed.eulerPlugin = await plugin.getAddress();
        pluginArray.push({ endpoint: deployed.eulerPlugin, config: "0x" });
        console.log("  " + deployed.eulerPlugin);
    }

    if (config.plugins.loanPlugins.uniswapV3) {
        console.log("Deploying UniswapV3Plugin...");
        const Plugin = await ethers.getContractFactory("UniswapV3Plugin");
        const plugin = await Plugin.deploy(opts);
        await plugin.waitForDeployment();
        deployed.uniswapPlugin = await plugin.getAddress();
        pluginArray.push({ endpoint: deployed.uniswapPlugin, config: "0x" });
        console.log("  " + deployed.uniswapPlugin);
    }

    if (config.plugins.swapPlugins.lifi) {
        console.log("Deploying LiFiPlugin...");
        const LiFi = await ethers.getContractFactory("LiFiPlugin");
        const lifi = await LiFi.deploy(opts);
        await lifi.waitForDeployment();
        deployed.lifiPlugin = await lifi.getAddress();
        pluginArray.push({
            endpoint: deployed.lifiPlugin,
            config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [config.plugins.swapPlugins.lifi])
        });
        console.log("  " + deployed.lifiPlugin);
    }

    if (config.plugins.swapPlugins.oneInch) {
        console.log("Deploying OneInchV6SwapPlugin...");
        const OneInch = await ethers.getContractFactory("OneInchV6SwapPlugin");
        const oneInch = await OneInch.deploy(opts);
        await oneInch.waitForDeployment();
        deployed.oneInchPlugin = await oneInch.getAddress();
        pluginArray.push({
            endpoint: deployed.oneInchPlugin,
            config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [config.plugins.swapPlugins.oneInch])
        });
        console.log("  " + deployed.oneInchPlugin);
    }

    if (config.plugins.swapPlugins.wsteth) {
        console.log("Deploying WstEthPlugin...");
        const WstEth = await ethers.getContractFactory("WstEthPlugin");
        const wstEth = await WstEth.deploy(opts);
        await wstEth.waitForDeployment();
        deployed.wstEthPlugin = await wstEth.getAddress();
        pluginArray.push({
            endpoint: deployed.wstEthPlugin,
            config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [config.plugins.swapPlugins.wsteth])
        });
        console.log("  " + deployed.wstEthPlugin);
    }

    console.log("Deploying CometMultiplierAdapter...");
    const Adapter = await ethers.getContractFactory("CometMultiplierAdapter");
    const adapter = await Adapter.deploy(pluginArray, config.weth, opts);
    await adapter.waitForDeployment();
    deployed.adapter = await adapter.getAddress();
    console.log("  " + deployed.adapter);

    const deploymentDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const deploymentData = {
        network: networkName,
        chainId: network.config.chainId,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: deployed,
        plugins: config.plugins
    };

    const outputPath = path.join(deploymentDir, `${networkName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));

    console.log("\nDeployment saved to:", outputPath);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nDeployment failed:");
        console.error(error);
        process.exit(1);
    });
