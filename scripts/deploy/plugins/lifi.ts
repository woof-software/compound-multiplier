import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { verify } from "../../utils/verify";

async function main() {
    const [deployer] = await ethers.getSigners();

    const endpoint = await ethers.deployContract("LiFiPlugin", [], deployer);
    await endpoint.waitForDeployment();

    const networkName = (await ethers.provider.getNetwork()).name;
    console.log(`\nDeployed LiFi Plugin on ${networkName} to:`, endpoint.target);

    await verify(endpoint.target, []);
    const deploymentsDir = path.join(__dirname, "../../../deployments");
    const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    let deployments: any = {};
    if (fs.existsSync(deploymentFile)) {
        const existingData = fs.readFileSync(deploymentFile, "utf8");
        deployments = JSON.parse(existingData);
    }

    if (!deployments.swapPlugins) {
        deployments.swapPlugins = {};
    }

    deployments.swapPlugins.lifi = {
        endpoint: endpoint.target
    };

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log(`Deployment info saved to: ${deploymentFile}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
