const { createPromptModule } = require("inquirer");
const { rm } = require("fs").promises;
const { join } = require("path");

async function removeWorkflows() {
    try {
        const folderPath = join(process.cwd(), ".github/workflows");
        await rm(folderPath, { recursive: true, force: true });
        console.log(`Workflows removed successfully.`);
    } catch (error) {
        console.error("Error when removing workflows:", error, "\n");
    }
}

async function suggestWorkflows() {
    const question = [
        {
            type: "confirm",
            name: "workflows",
            message: `Do you need GitHub Action workflows for testing and linting?`,
            default: true
        }
    ];
    const prompt = createPromptModule();
    const answer = await prompt(question);

    if (!answer.workflows) await removeWorkflows();
}

module.exports = { suggestWorkflows };
