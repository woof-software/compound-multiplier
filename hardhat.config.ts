/* eslint @typescript-eslint/no-non-null-assertion: ["off"] */

import { HardhatUserConfig, subtask } from "hardhat/config";
import type { MultiSolcUserConfig } from "hardhat/src/types/config";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
/* Uncomment if support of TypeScript `paths` mappings is needed.
 * Make sure to run `pnpm add -D "tsconfig-paths@4.2.0"` in this case.
 */
// import "tsconfig-paths/register";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
/* `hardhat-tracer` traces events, calls and storage operations as tests progress.
 * However, it slows down test execution even when not in use. It can be commented out if it is not needed.
 */
import "hardhat-tracer";
import "solidity-docgen"; // The tool by OpenZeppelin to generate documentation for contracts in Markdown.
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-exposed";
import "@openzeppelin/hardhat-upgrades";

import dotenv from "dotenv";
dotenv.config();

import "./scripts/tasks/generate-account";

/* Sets the action for the `TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS` task.
 *
 * The approach to ignore Solidity files in `test` directories for Hardhat speeds up its compilation process
 * significantly. This is especially true in large projects with a lot of Foundry tests.
 * It can be also extended for deployment scripts as well.
 * See for more details:
 * `https://kennysliding.medium.com/how-to-ignore-solidity-files-in-hardhat-compilation-6162963f8c84`
 */
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_, __, runSuper) => {
    /* Get the list of source paths that would normally be passed to the Solidity compiler, then
     * apply a filter function to exclude paths that contain the string "test".
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (await runSuper()).filter((p: any) => !p.includes("test"));
});

const envs = process.env;

// Private keys can be set in `.env` file.
const ethereumMainnetKeys = envs.ETHEREUM_MAINNET_KEYS?.split(",") ?? [];
const ethereumTestnetKeys = envs.ETHEREUM_TESTNET_KEYS?.split(",") ?? [];

const isOptionTrue = (option: string | undefined) => ["true", "1"].includes(option ?? "");

/* The solc compiler optimizer is disabled by default to keep the Hardhat stack traces' line numbers the same.
 * To enable, set `RUN_OPTIMIZER` to `true` in the `.env` file.
 */
const optimizerRuns = isOptionTrue(envs.RUN_OPTIMIZER) || isOptionTrue(envs.REPORT_GAS);
const optimizerRunNum = envs.OPTIMIZER_RUN_NUM ? +envs.OPTIMIZER_RUN_NUM : 200;
const viaIR = envs.VIA_IR ? isOptionTrue(envs.VIA_IR) : true;

const enableForking = isOptionTrue(envs.FORKING);

const mochaSerial = isOptionTrue(envs.SERIAL);
const mochaBail = isOptionTrue(envs.BAIL);

const enableSourcify = envs.SOURCIFY ? true : envs.ETHERSCAN_API_KEY ? false : true;

const abiExporterExceptions = ["interfaces/", "mocks/", "vendor/", "contracts-exposed/"];
const forkNetwork = envs.FORK_NETWORK?.toLowerCase();
let forkUrl = "";

if (forkNetwork) {
    const envVarName = `${forkNetwork.toUpperCase()}_URL`;
    forkUrl = envs[envVarName] ?? "";
}

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.30",
                settings: {
                    viaIR: viaIR,
                    optimizer: {
                        enabled: optimizerRuns,
                        runs: optimizerRunNum,
                        details: {
                            yulDetails: {
                                optimizerSteps: optimizerRuns ? "u" : undefined
                            }
                        }
                    }
                }
            }
        ]
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: !optimizerRuns,
            accounts: {
                accountsBalance: envs.ACCOUNT_BALANCE ?? "10000000000000000000000", // 10000 ETH.
                count: envs.NUMBER_OF_ACCOUNTS ? +envs.NUMBER_OF_ACCOUNTS : 20
            },
            forking:
                enableForking && forkUrl
                    ? {
                          url: forkUrl,
                          enabled: true
                      }
                    : undefined,
            gasPrice: 14e9
        },
        ethereum: {
            chainId: 1,
            url: envs.ETHEREUM_URL ?? "",
            accounts: [...ethereumMainnetKeys]
        },
        arbitrum: {
            chainId: 42161,
            url: envs.ARBITRUM_URL ?? "",
            accounts: [...ethereumMainnetKeys]
        },
        base: {
            chainId: 8453,
            url: envs.BASE_URL ?? "",
            accounts: [...ethereumMainnetKeys]
        },
        optimism: {
            chainId: 10,
            url: envs.OPTIMISM_URL ?? "",
            accounts: [...ethereumMainnetKeys]
        },
        polygon: {
            chainId: 137,
            url: envs.POLYGON_URL ?? "",
            accounts: [...ethereumMainnetKeys]
        },
        linea: {
            chainId: 59140,
            url: envs.LINEA_URL ?? "",
            accounts: [...ethereumMainnetKeys]
        },
        unichain: {
            chainId: 888,
            url: envs.UNICHAIN_URL ?? "",
            accounts: [...ethereumMainnetKeys]
        }
    },
    etherscan: {
        // API V2 requires a single Etherscan.io API key instead of network-specific keys
        apiKey: envs.ETHERSCAN_API_KEY ?? envs.ARBISCAN_API_KEY ?? "",
        customChains: [
            {
                network: "arbitrum",
                chainId: 42161,
                urls: {
                    apiURL: "https://api.arbiscan.io/api",
                    browserURL: "https://arbiscan.io"
                }
            },
            {
                network: "arbitrumOne",
                chainId: 42161,
                urls: {
                    apiURL: "https://api.arbiscan.io/api",
                    browserURL: "https://arbiscan.io"
                }
            }
        ]
    },
    sourcify: {
        enabled: enableSourcify
    },
    gasReporter: {
        enabled: envs.REPORT_GAS !== undefined,
        excludeContracts: ["vendor/"],
        // currency: "USD", // "CHF", "EUR", etc.
        darkMode: true,
        showMethodSig: true,
        L1Etherscan: envs.ETHERSCAN_API_KEY
        // trackGasDeltas: true // Track and report changes in gas usage between test runs.
    },
    mocha: {
        timeout: 100000,
        //parallel: !mochaSerial,
        bail: mochaBail
    },
    docgen: {
        pages: "files",
        exclude: ["mocks", "vendor", "contracts-exposed", "test", "misc", "interfaces", "external"],
        outputDir: "./docs"
    },
    contractSizer: {
        except: ["mocks/", "vendor/", "contracts-exposed/", "test/"]
    },
    abiExporter: [
        {
            path: "./abi/json",
            format: "json",
            except: abiExporterExceptions,
            spacing: 4
        },
        {
            path: "./abi/minimal",
            format: "minimal",
            except: abiExporterExceptions,
            spacing: 4
        },
        {
            path: "./abi/full",
            format: "fullName",
            except: abiExporterExceptions,
            spacing: 4
        }
    ],
    exposed: {
        imports: true,
        initializers: true,
        exclude: ["vendor/**/*"]
    }
};

if (envs.EVM_VERSION !== "default")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (config.solidity! as MultiSolcUserConfig).compilers[0].settings!.evmVersion = envs.EVM_VERSION ?? "prague";

// By default fork from the latest block.
if (envs.FORKING_BLOCK_NUMBER) config.networks!.hardhat!.forking!.blockNumber = +envs.FORKING_BLOCK_NUMBER;
if (envs.HARDFORK !== "default") config.networks!.hardhat!.hardfork = envs.HARDFORK ?? "prague";

// Extra settings for `hardhat-gas-reporter`.
if (envs.COINMARKETCAP_API_KEY) config.gasReporter!.coinmarketcap = envs.COINMARKETCAP_API_KEY;
if (envs.REPORT_GAS_FILE_TYPE === "md") {
    config.gasReporter!.outputFile = "gas-report.md";
    config.gasReporter!.reportFormat = "markdown";
    config.gasReporter!.forceTerminalOutput = true;
    config.gasReporter!.forceTerminalOutputFormat = "terminal";
}
if (envs.REPORT_GAS_FILE_TYPE === "json") {
    config.gasReporter!.outputJSON = true;
    config.gasReporter!.outputJSONFile = "gas-report.json";
    config.gasReporter!.includeBytecodeInJSON = true;
}

export default config;
