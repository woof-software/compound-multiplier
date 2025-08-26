// This script contains the task for generating an externally-owned account (EOA).

import { scope, types } from "hardhat/config";

const generatingScope = scope("generate", "Generation of an externally-owned account");

generatingScope
    .task("account", "Generate an externally-owned account (EOA)")
    .addOptionalParam("number", "The number of accounts to be generated", 1, types.int)
    .addOptionalParam("format", "Set to `json` to output in JSON format", "txt", types.string)
    // eslint-disable-next-line @typescript-eslint/require-await
    .setAction(async ({ number, format }, hre) => {
        const { ethers } = hre;
        number = number as number;
        format = format as string;

        console.log();
        switch (format) {
            case "json": {
                const obj: Record<string, Record<string, string>> = {};
                for (let i = 0; i < number; ++i) {
                    const wallet = ethers.Wallet.createRandom(ethers.provider);
                    obj[i] = {
                        ...(wallet.mnemonic ? { mnemonic: wallet.mnemonic.phrase } : {}),
                        public_address: wallet.address,
                        private_key: wallet.privateKey
                    };
                }
                console.log(JSON.stringify(obj, null, 4));
                break;
            }

            default:
                for (let i = 0; i < number; ++i) {
                    const wallet = ethers.Wallet.createRandom(ethers.provider);
                    console.log(
                        `Account #${(i + 1).toString()}\n` +
                            (wallet.mnemonic ? `The mnemonic phrase:\t${wallet.mnemonic.phrase}\n` : "") +
                            `The public address:\t${wallet.address}\n` +
                            `The private key:\t${wallet.privateKey}\n`
                    );
                }
                break;
        }
    });
