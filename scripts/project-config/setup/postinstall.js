const { writeFile } = require("fs").promises;
const { join } = require("path");
const { suggestOptionalDependencies } = require("./install-optional-deps.js");
const { suggestAuditMode } = require("./suggest-audit-mode.js");
const { suggestWorkflows } = require("./suggest-github-workflows.js");
const { fileExists } = require("./file-exists.js");
const { removeTemplateLicense } = require("./remove-template-license.js");
const { suggestBranchProtection } = require("./suggest-branch-protection.js");

async function createFileInitialized() {
    const fileName = ".initialized";
    try {
        await writeFile(join(__dirname, fileName), "");
    } catch (err) {
        console.error(`Error when creating the file \`${fileName}\`: ${err}\n`);
    }
}

async function finalizeAfterInstallation() {
    if (process.env.GH_ACTION) return;
    if (await fileExists(join(__dirname, ".initialized"))) return;

    console.log("Starting project initialization...\n");
    await removeTemplateLicense();
    await suggestOptionalDependencies();
    await suggestAuditMode();
    await suggestWorkflows();
    await suggestBranchProtection();
    await createFileInitialized();
    console.log("\nInitialization completed successfully.");
}

finalizeAfterInstallation().catch((error) => {
    console.error("Error:", error, "\n");
    process.exitCode = 1;
});
