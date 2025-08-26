const { createPromptModule } = require("inquirer");
const { copyFile, unlink, readFile, writeFile } = require("fs").promises;
const { join } = require("path");

async function setAuditMode() {
    const rootPath = process.cwd();
    const pathToFiles = join(rootPath, "scripts/project-config/setup/audit-mode-files");
    try {
        // Define the files to copy and remove.
        const filesToCopy = [
            { src: join(pathToFiles, "husky_pre_commit.sh"), dest: `${rootPath}/.husky/pre-commit` },
            { src: join(pathToFiles, "lintstaged.json"), dest: `${rootPath}/.lintstagedrc.json` }
        ];
        const filesToRemove = [`${rootPath}/.husky/pre-push`];

        // Copy and remove the files.
        for (const file of filesToCopy) await copyFile(file.src, file.dest);
        for (const file of filesToRemove) {
            try {
                await unlink(file);
            } catch (err) {
                console.error(`Error when removing ${file}: ${err.message}\n`);
            }
        }

        // Correcting the lint workflow.
        const lintWorkflowPath = `${rootPath}/.github/workflows/lint.yml`;
        try {
            let data = await readFile(lintWorkflowPath, "utf8");
            data = data
                .replace(/\s*pnpm solhint "contracts\/\*\*\/\*.sol"/, "")
                .replace(
                    /pnpm prettier --no-error-on-unmatched-pattern --check -u "\*"/,
                    'pnpm prettier --no-error-on-unmatched-pattern --check "**/*.{ts,js,mjs,json,jsonc,md}"'
                );
            await writeFile(lintWorkflowPath, data, "utf8");
        } catch (err) {
            console.error(`Error when correcting ${lintWorkflowPath}: ${err.message}\n`);
        }

        console.log("The audit mode is set.");
    } catch (error) {
        console.error("Error when setting the audit mode:", error, "\n");
    }
}

async function suggestAuditMode() {
    const question = [
        {
            type: "confirm",
            name: "setAuditMode",
            message: `If you are going to audit rather than develop, \
it is recommended to disable formatting for contracts so as not to change the source code.
Disable formatting for contracts?`,
            default: false
        }
    ];
    const prompt = createPromptModule();
    const answer = await prompt(question);

    if (answer.setAuditMode) await setAuditMode();

    return answer.setAuditMode;
}

module.exports = { suggestAuditMode };
