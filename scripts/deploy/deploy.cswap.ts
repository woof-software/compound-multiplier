import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../utils/verify";

interface Plugin {
    endpoint: string;
    flp: string;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = network.name;
    console.log("Network:", networkName);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    const deploymentFile = path.join(__dirname, "..", "..", "deployments", `${networkName}.json`);
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Plugins not deployed. Run deploy.plugins.ts first. Missing file: ${deploymentFile}`);
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    if (!deploymentData.loanPlugins || !deploymentData.swapPlugins) {
        throw new Error("Plugins data not found in deployment file");
    }

    const flashPluginWhitelist = ["aave", "balancer"];
    const flashPlugins: Plugin[] = [];

    for (const name of flashPluginWhitelist) {
        const plugin = deploymentData.loanPlugins[name];
        if (plugin) {
            flashPlugins.push({
                endpoint: plugin.endpoint,
                flp: plugin.flp
            });
            console.log(`Added ${name} plugin:`, plugin.endpoint);
        }
    }

    if (flashPlugins.length === 0) {
        throw new Error("No flash loan plugins found. CometCollateralSwap requires AAVE or Balancer plugins.");
    }

    const lifiPlugin = deploymentData.swapPlugins.lifi;
    if (!lifiPlugin) {
        throw new Error("LiFi plugin not found. CometCollateralSwap requires LiFi plugin.");
    }

    const swapRouter = lifiPlugin.router;
    const swapPluginEndpoint = lifiPlugin.endpoint;

    console.log(`\nSwap router (LiFi):`, swapRouter);
    console.log(`Swap plugin endpoint:`, swapPluginEndpoint);
    console.log(`Total flash plugins:`, flashPlugins.length);

    const gasPrice = network.config.gasPrice;
    const opts = gasPrice ? { gasPrice } : {};

    console.log("\nDeploying CometCollateralSwap...");
    const CometCollateralSwap = await ethers.deployContract(
        "CometCollateralSwap",
        [flashPlugins, swapRouter, swapPluginEndpoint],
        { ...opts, from: deployer.address }
    );

    await CometCollateralSwap.waitForDeployment();
    const swapAddress = await CometCollateralSwap.getAddress();

    console.log("\nVerifying contract...");
    await verify(swapAddress, [flashPlugins, swapRouter, swapPluginEndpoint]);
    deploymentData.CometCollateralSwap = swapAddress;
    deploymentData.collateralSwapDeployedAt = new Date().toISOString();

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

    console.log("\n=== Deployment Complete ===");
    console.log("CometCollateralSwap:", swapAddress);
    console.log("Deployment saved to:", deploymentFile);
    console.log("\n✓ Success!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nDeployment failed:");
        console.error(error);
        process.exit(1);
    });
