import { ethers, network } from "hardhat";
import { deployConfig } from "./deploy.config";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../utils/verify";

function encodePluginConfig(address: string): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(["address"], [address]);
}

function encodeBatchConfig(pools: { token: string; pool: string }[]): string {
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

    // Morpho Plugin
    if (deploymentData.loanPlugins.morpho && config.plugins?.loanPlugins?.morpho) {
        const morphoConfig = encodePluginConfig(config.plugins.loanPlugins.morpho);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.morpho.endpoint,
            config: morphoConfig
        });
        console.log("Added Morpho plugin:", deploymentData.loanPlugins.morpho.endpoint);
    } else if (deploymentData.loanPlugins.morpho) {
        console.log("Skipping Morpho plugin (not configured in config file)");
    }

    // Euler Plugin
    if (
        deploymentData.loanPlugins.euler &&
        config.plugins?.loanPlugins?.euler &&
        config.plugins.loanPlugins.euler.length > 0
    ) {
        const eulerConfig = encodeBatchConfig(config.plugins.loanPlugins.euler);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.euler.endpoint,
            config: eulerConfig
        });
        console.log("Added Euler V2 plugin:", deploymentData.loanPlugins.euler.endpoint);
        console.log("Vaults configured:", config.plugins.loanPlugins.euler.length);
    } else if (deploymentData.loanPlugins.euler) {
        console.log("Skipping Euler V2 plugin (not configured in config file)");
    }

    // Uniswap V3 Plugin
    if (
        deploymentData.loanPlugins.uniswapV3 &&
        config.plugins?.loanPlugins?.uniswapV3 &&
        config.plugins.loanPlugins.uniswapV3.length > 0
    ) {
        const uniswapV3Config = encodeBatchConfig(config.plugins.loanPlugins.uniswapV3);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.uniswapV3.endpoint,
            config: uniswapV3Config
        });
        console.log("Added Uniswap V3 plugin:", deploymentData.loanPlugins.uniswapV3.endpoint);
        console.log("Pools configured:", config.plugins.loanPlugins.uniswapV3.length);
    } else if (deploymentData.loanPlugins.uniswapV3) {
        console.log("Skipping Uniswap V3 plugin (not configured in config file)");
    }

    // Uniswap V4 Plugin
    if (
        deploymentData.loanPlugins.uniswapV4 &&
        config.plugins?.loanPlugins?.uniswapV4 &&
        config.plugins.loanPlugins.uniswapV4.length > 0
    ) {
        const uniswapV4Config = encodePluginConfig(config.plugins.loanPlugins.uniswapV4);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.uniswapV4.endpoint,
            config: uniswapV4Config
        });
        console.log("Added Uniswap V4 plugin:", deploymentData.loanPlugins.uniswapV4.endpoint);
        console.log("Pools configured:", config.plugins.loanPlugins.uniswapV4.length);
    } else if (deploymentData.loanPlugins.uniswapV4) {
        console.log("Skipping Uniswap V4 plugin (not configured in config file)");
    }

    // AAVE Plugin
    if (deploymentData.loanPlugins.aave && config.plugins?.loanPlugins?.aave) {
        const aaveConfig = encodePluginConfig(config.plugins.loanPlugins.aave);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.aave.endpoint,
            config: aaveConfig
        });
        console.log("Added AAVE plugin:", deploymentData.loanPlugins.aave.endpoint);
    } else if (deploymentData.loanPlugins.aave) {
        console.log("Skipping AAVE plugin (not configured in config file)");
    }

    // Balancer Plugin
    if (deploymentData.loanPlugins.balancer && config.plugins?.loanPlugins?.balancer) {
        const balancerConfig = encodePluginConfig(config.plugins.loanPlugins.balancer);
        pluginArray.push({
            endpoint: deploymentData.loanPlugins.balancer.endpoint,
            config: balancerConfig
        });
        console.log("Added Balancer plugin:", deploymentData.loanPlugins.balancer.endpoint);
    } else if (deploymentData.loanPlugins.balancer) {
        console.log("Skipping Balancer plugin (not configured in config file)");
    }

    // LiFi Plugin
    if (deploymentData.swapPlugins.lifi && config.plugins?.swapPlugins?.lifi) {
        const lifiConfig = encodePluginConfig(config.plugins.swapPlugins.lifi);
        pluginArray.push({
            endpoint: deploymentData.swapPlugins.lifi.endpoint,
            config: lifiConfig
        });
        console.log("Added LiFi plugin:", deploymentData.swapPlugins.lifi.endpoint);
    } else if (deploymentData.swapPlugins.lifi) {
        console.log("Skipping LiFi plugin (not configured in config file)");
    }

    // 1inch Plugin
    if (deploymentData.swapPlugins.oneInch && config.plugins?.swapPlugins?.oneInch) {
        const oneInchConfig = encodePluginConfig(config.plugins.swapPlugins.oneInch);
        pluginArray.push({
            endpoint: deploymentData.swapPlugins.oneInch.endpoint,
            config: oneInchConfig
        });
        console.log("Added 1inch plugin:", deploymentData.swapPlugins.oneInch.endpoint);
    } else if (deploymentData.swapPlugins.oneInch) {
        console.log("Skipping 1inch plugin (not configured in config file)");
    }

    // WstETH Plugin (no config needed)
    if (deploymentData.swapPlugins.wsteth) {
        pluginArray.push({
            endpoint: deploymentData.swapPlugins.wsteth.endpoint,
            config: "0x"
        });
        console.log("Added WstETH plugin:", deploymentData.swapPlugins.wsteth.endpoint);
    }

    if (pluginArray.length === 0) {
        throw new Error("No plugins configured. Please add plugin configurations to deploy.config.ts");
    }

    console.log(`\nDeploying CometFoundation with ${pluginArray.length} plugins...`);

    const Adapter = await ethers.getContractFactory("CometFoundation");
    const adapter = await Adapter.deploy(pluginArray, config.weth, config.treasury, opts);
    await adapter.waitForDeployment();

    const adapterAddress = await adapter.getAddress();

    console.log("\nCometFoundation deployed:", adapterAddress);

    console.log("\nVerifying contract on Etherscan...");
    try {
        await verify(adapterAddress, [pluginArray, config.weth, config.treasury]);
        console.log("Contract verified");
    } catch (error) {
        console.warn("Verification failed:", error);
    }

    deploymentData.CometFoundation = adapterAddress;
    deploymentData.foundationDeployedAt = new Date().toISOString();
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

    console.log("\nDeployment file updated:", deploymentFile);
    console.log("Deployment completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nDeployment failed:");
        console.error(error);
        process.exit(1);
    });
