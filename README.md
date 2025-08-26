# Solidity base using Hardhat and Foundry

## Installation

Prerequisites: install [Node.js](https://nodejs.org/en/download/package-manager) 22.10+ with `pnpm` and [Visual Studio Code](https://code.visualstudio.com/download).

Open [the root of the project](./) using Visual Studio Code and install all the extensions recommended by notifications of Visual Studio Code, then restart Visual Studio Code.

Open the terminal and run the command below to install all the dependencies and prepare the project:

```shell
pnpm i
```

Run to view commands:

```shell
pnpm run
```

## Some unsorted notes

### Commands

- `pnpm coverage` shows all coverage and `pnpm test` runs all Hardhat and Foundry tests.
- `pnpm testh:vvv test/SomeContract.ts` and `pnpm testf -vvv --mc SomeContractTests` show details about events, calls, gas costs, etc.
- `pnpm coveragef:sum` show a coverage summary with branches for Foundry.

### Environment variables

The project can properly work without the \`.env\` file, but supports some variables (see `.env.details` for details). For example:

- `BAIL=true` to stop tests on the first failure.
- `EVM_VERSION="default"` and `HARDFORK="default"` if you would not like to use Prague, but would like Hardhat to behave by default.
- `VIA_IR=false` to disable IR optimization. You may also need to disable it in `.solcover.js` if compilation issues when running coverage.
- `COINMARKETCAP_API_KEY` and `ETHERSCAN_API_KEY` if you would like to see gas costs in dollars when running `pnpm testh:gas`.

### VS Code

- The `Watch` button can show/hide highlighting of the code coverage in the contract files after running `pnpm coverage`. The button is in the lower left corner of the VS Code window and added by `ryanluker.vscode-coverage-gutters`.

- Open the context menu (right-click) in a contract file, after running `pnpm coverage`, and select "Coverage Gutters: Preview Coverage Report" (or press Ctrl+Shift+6) to open the coverage HTML page directly in VS Code.

- Start writing `ss` in Solidity or TypeScript files to see some basic snippets.

## Troubleshooting

Run to clean up the project:

```shell
pnpm run clean
```

Afterwards, try again.
