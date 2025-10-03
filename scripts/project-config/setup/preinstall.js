const { accessSync, writeFileSync } = require("fs");
const { join } = require("path");
const { enforcePNPMPackageManager } = require("./enforce-pnpm.js");
const { initializeGitRepository } = require("./init-git.js");
const { installGitSubmodules } = require("./install-git-submodules.js");

function fileExists(filePath) {
    try {
        accessSync(filePath);
        return true;
    } catch {
        return false;
    }
}

function createFileInstalled() {
    const fileName = ".installed";
    try {
        writeFileSync(join(__dirname, fileName), "");
    } catch (err) {
        console.error(`Error when creating the file \`${fileName}\`: ${err}\n`);
    }
}

function prepareForInstallation() {
    if (process.env.GH_ACTION) return;
    if (fileExists(join(__dirname, ".installed"))) return;

    console.log();
    enforcePNPMPackageManager();
    initializeGitRepository(); // Recommended for Foundry.
    installGitSubmodules().catch((error) => {
        console.error("Error when installing Git submodules:", error, "\n");
    });
    createFileInstalled();
}

prepareForInstallation();
