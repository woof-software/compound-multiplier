import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../utils/verify";

interface Plugin {
    endpoint: string;
    flp: string;
}

async function main() {
    const [deployer] = await ethers.getSigners();

    const networkName = (await ethers.provider.getNetwork()).name;
    const deploymentFile = path.join(__dirname, `../../deployments/${networkName}.json`);

    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file for network ${networkName} does not exist.`);
    }

    const deploymentsData = fs.readFileSync(deploymentFile, "utf8");
    const deployments = JSON.parse(deploymentsData);

    if (!deployments.FlashPlugins) {
        throw new Error("No FlashPlugins found in the deployment file.");
    }

    const pluginsWhitelist = ["balancer", "aave"];

    const filteredPlugins: Plugin[] = Object.entries(deployments.FlashPlugins)
        .filter(([pluginName]) => pluginsWhitelist.includes(pluginName))
        .map(([pluginName, plugin]) => ({
            endpoint: (plugin as Plugin).endpoint,
            flp: (plugin as Plugin).flp
        }));

    if (!deployments.LiFiPlugin) {
        throw new Error("LiFiPlugin not found in deployment file.");
    }

    const lifiPlugin = deployments.LiFiPlugin;
    const swapRouter = lifiPlugin.router;
    const swapPlugin = lifiPlugin.endpoint;

    console.log("Filtered Plugins:", filteredPlugins);
    console.log("Swap Router:", swapRouter);
    console.log("Swap Plugin:", swapPlugin);

    console.log(filteredPlugins, swapRouter, swapPlugin);

    const CometCollateralSwap = await ethers.deployContract(
        "CometCollateralSwap",
        [filteredPlugins, swapRouter, swapPlugin],
        deployer
    );

    await CometCollateralSwap.waitForDeployment();

    await verify(CometCollateralSwap.target, [filteredPlugins, swapRouter, swapPlugin]);

    console.log(`\nDeployed CometCollateralSwap on ${networkName} to:`, CometCollateralSwap.target);

    // Save deployment info back to JSON file
    deployments.CometCollateralSwap = CometCollateralSwap.target;

    // Write updated deployments back to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

    console.log(`Deployment info saved to: ${deploymentFile}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
