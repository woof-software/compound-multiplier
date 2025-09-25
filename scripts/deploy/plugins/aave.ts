import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../../utils/verify";

async function main() {
    const [deployer] = await ethers.getSigners();

    const FLP = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

    const endpoint = await ethers.deployContract("AAVEPlugin", [], deployer);

    await verify(endpoint.target, []);

    const networkName = (await ethers.provider.getNetwork()).name;

    console.log(`\nDeployed AAVE Plugin on ${networkName} to:`, endpoint.target);

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

    // Add AAVE Plugin deployment info
    deployments.FlashPlugins.aave = {
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
