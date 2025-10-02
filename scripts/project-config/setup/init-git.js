const { execSync } = require("child_process");
const { existsSync } = require("fs");

function initializeGitRepository() {
    if (!existsSync(".git")) {
        console.log("No Git repository found. Initializing one for Foundry...");
        try {
            execSync("git init", { stdio: "inherit" });
        } catch (error) {
            console.error("Error when initializing a Git repository:", error, "\n");
            process.exit(1);
        }
    }
}

module.exports = { initializeGitRepository };
