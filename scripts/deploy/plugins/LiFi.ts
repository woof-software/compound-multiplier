import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../../utils/verify";

async function main() {
    const [deployer] = await ethers.getSigners();
    const SWAP_ROUTER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";

    const LiFiPlugin = await ethers.deployContract("LiFiPlugin", [], deployer);

    await verify(LiFiPlugin.target, []);

    const networkName = (await ethers.provider.getNetwork()).name;

    console.log(`\nDeployed LiFiPlugin on ${networkName} to:`, LiFiPlugin.target);

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

    // Add LiFiPlugin deployment info
    deployments.LiFiPlugin = {
        endpoint: LiFiPlugin.target,
        router: SWAP_ROUTER
    };

    // Save updated deployments
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

    console.log(`Deployment info saved to: ${deploymentFile}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
