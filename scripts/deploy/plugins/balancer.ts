import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../../utils/verify";

async function main() {
    const [deployer] = await ethers.getSigners();

    const FLP = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

    const endpoint = await ethers.deployContract("BalancerPlugin", [], deployer);

    await verify(endpoint.target, []);

    const networkName = (await ethers.provider.getNetwork()).name;

    console.log(`\nDeployed Balancer Plugin on ${networkName} to:`, endpoint.target);

    // Save deployment addresses to JSON file
    const deploymentsDir = path.join(__dirname, "../../../deployments");
    const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);

    // Ensure deployments directory exists
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Load existing deployments or create empty object
    let deployments: any = {};
    if (fs.existsSync(deploymentFile)) {
        const existingData = fs.readFileSync(deploymentFile, "utf8");
        deployments = JSON.parse(existingData);
    }

    // Ensure FlashPlugins object exists
    if (!deployments.FlashPlugins) {
        deployments.FlashPlugins = {};
    }

    // Add Balancer Plugin deployment info
    deployments.FlashPlugins.balancer = {
        endpoint: endpoint.target,
        flp: FLP
    };

    // Save updated deployments
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

    console.log(`Deployment info saved to: ${deploymentFile}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
