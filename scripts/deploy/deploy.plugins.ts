import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
//import { verify } from "../utils/verify";
import { deployConfig } from "./deploy.config";

interface PluginInfo {
    type: "loan" | "swap";
    contractName: string;
}

const pluginMap: Record<string, PluginInfo> = {
    morpho: { type: "loan", contractName: "MorphoPlugin" },
    euler: { type: "loan", contractName: "EulerV2Plugin" },
    uniswapV3: { type: "loan", contractName: "UniswapV3Plugin" },
    uniswapV4: { type: "loan", contractName: "UniswapV4Plugin" },
    aave: { type: "loan", contractName: "AAVEPlugin" },
    balancer: { type: "loan", contractName: "BalancerPlugin" },
    lifi: { type: "swap", contractName: "LiFiPlugin" },
    oneInch: { type: "swap", contractName: "OneInchPlugin" }
};

async function deployPlugin(contractName: string, pluginType: "loan" | "swap", key: string, deployments: any) {
    const [deployer] = await ethers.getSigners();
    const endpoint = await ethers.deployContract(contractName, [], { signer: deployer });
    await endpoint.waitForDeployment();
    const address = await endpoint.getAddress();

    console.log(`Deployed ${contractName} (${key}) on ${network.name} to: ${address}`);

    // try {
    //     await verify(address, []);
    //     console.log(`Verified ${contractName}`);
    // } catch (error) {
    //     console.warn(`Verification failed for ${contractName}:`, error);
    // }

    if (!deployments[`${pluginType}Plugins`]) {
        deployments[`${pluginType}Plugins`] = {};
    }
    deployments[`${pluginType}Plugins`][key] = { endpoint: address };
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

    const deploymentsDir = path.join(__dirname, "..", "..", "deployments");
    const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    let deployments: any = {};
    if (fs.existsSync(deploymentFile)) {
        const existingData = fs.readFileSync(deploymentFile, "utf8");
        deployments = JSON.parse(existingData);
    }

    const loanKeys = Object.keys(config.plugins.loanPlugins || {});
    const swapKeys = Object.keys(config.plugins.swapPlugins || {});

    for (const key of loanKeys) {
        const info = pluginMap[key];
        if (info && info.type === "loan") {
            await deployPlugin(info.contractName, "loan", key, deployments);
        } else {
            console.log(`Skipping unknown loan plugin: ${key}`);
        }
    }

    for (const key of swapKeys) {
        const info = pluginMap[key];
        if (info && info.type === "swap") {
            await deployPlugin(info.contractName, "swap", key, deployments);
        } else {
            console.log(`Skipping unknown swap plugin: ${key}`);
        }
    }

    const wstethNetworks = ["mainnet"];
    if (wstethNetworks.includes(networkName)) {
        await deployPlugin("WstEthPlugin", "swap", "wsteth", deployments);
    }

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentFile}`);
    console.log("Plugins deployment completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nDeployment failed:");
        console.error(error);
        process.exit(1);
    });
