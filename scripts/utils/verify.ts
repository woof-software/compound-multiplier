import { Addressable } from "ethers";
import { ethers, run } from "hardhat";

export async function verify(contractAddress: string | Addressable, args: any[]) {
    if ((await ethers.provider.getNetwork()).chainId === 31337n) {
        console.log("Local network detected, skipping verification.");
        return;
    }

    console.log("Verifying contract...");
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args
        });
    } catch (e) {
        if (typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string") {
            if ((e as any).message.toLowerCase().includes("already verified")) {
                console.log("Already verified!");
            } else {
                console.log(e);
            }
        } else {
            console.log(e);
        }
    }
}
