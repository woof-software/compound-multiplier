import { ethers, network } from "hardhat";
import { deployConfig } from "./deploy.config";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../utils/verify";

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
    const loanPluginNames = ["morpho", "euler", "uniswapV3"];
    for (const name of loanPluginNames) {
        const plugin = deploymentData.loanPlugins[name];
        if (plugin) {
            pluginArray.push({
                endpoint: plugin.endpoint,
                config: "0x"
            });
            console.log(`Added ${name} plugin:`, plugin.endpoint);
        }
    }

    const swapPluginNames = ["lifi", "oneInch", "wsteth"];
    for (const name of swapPluginNames) {
        const plugin = deploymentData.swapPlugins[name];
        if (plugin) {
            pluginArray.push({
                endpoint: plugin.endpoint,
                config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [plugin.router])
            });
            console.log(`Added ${name} plugin:`, plugin.endpoint);
        }
    }

    console.log("\nDeploying CometMultiplier...");
    const Adapter = await ethers.getContractFactory("CometMultiplier");
    const adapter = await Adapter.deploy(pluginArray, config.weth, opts);
    await adapter.waitForDeployment();
    const adapterAddress = await adapter.getAddress();

    console.log("\nVerifying contract...");
    await verify(adapterAddress, [pluginArray, config.weth]);

    deploymentData.CometMultiplier = adapterAddress;
    deploymentData.multiplierDeployedAt = new Date().toISOString();

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

    console.log("CometMultiplier:", adapterAddress);
    console.log("Deployment saved to:", deploymentFile);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nDeployment failed:");
        console.error(error);
        process.exit(1);
    });
