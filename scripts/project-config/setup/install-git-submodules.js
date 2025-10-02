const { readFile } = require("fs").promises;
const { execAsync } = require("./exec-async");
const { fileExists } = require("./file-exists");

/*
 * Parses the `.gitmodules` file to extract the organization, repository and branch for each submodule, then
 * returns an object with keys as module names.
 */
async function parseGitSubmodules() {
    const data = await readFile(`${process.cwd()}/.gitmodules`, "utf-8");
    const modules = {};
    const lines = data.split("\n");
    let currentModule = null;

    for (const line of lines) {
        const trimmedLine = line.trim();
        // Start a new module block.
        if (trimmedLine.startsWith("[submodule")) {
            if (currentModule) modules[currentModule.name] = currentModule;
            // Expecting a line like: [submodule "moduleName"].
            const nameMatch = trimmedLine.match(/"(.*?)"/);
            currentModule = {
                name: nameMatch ? nameMatch[1] : "",
                organization: "",
                repository: "",
                path: "",
                branch: ""
            };
        } else if (trimmedLine.startsWith("url =")) {
            // Get the URL string.
            const url = trimmedLine.split("=")[1].trim();
            // Extract organization and repository using a regex.
            // The regex for URL formats like `https://github.com/org/repo.git` or `git@github.com:org/repo.git`.
            const match = url.match(/[:\\/]([^\\/:]+)\/([^\\/]+?)(?:\.git)?$/);
            if (match) {
                currentModule.organization = match[1];
                currentModule.repository = match[2];
            } else console.warn(`\nUnable to parse organization and repository from URL: ${url}\n`);
        } else if (trimmedLine.startsWith("path =")) currentModule.path = trimmedLine.split("=")[1].trim();
        else if (trimmedLine.startsWith("branch =")) currentModule.branch = trimmedLine.split("=")[1].trim();
    }

    if (currentModule) modules[currentModule.name] = currentModule;

    return modules;
}

async function isSubmoduleInstalled(modulePath) {
    return fileExists(modulePath);
}

/*
 * Uses the Foundry forge to install a module.
 * Constructs a command like: `forge install organization/repository@version`.
 */
async function installSubmodule(m) {
    console.log(`Restoring the submodule ${m.name}...`);
    if (!m.organization || !m.repository) throw new Error(`Missing organization or repository for module ${m.name}.\n`);

    // Construct the identifier for `forge install`. If a branch is specified, then append it with the symbol '@'.
    const cmd = `forge install ${m.organization}/${m.repository}${m.branch ? `@${m.branch}` : ""} --no-commit`;
    try {
        await execAsync(cmd);
    } catch (error) {
        console.error("Failed to install a module using `forge`:", error, "\n");
    }
    console.log(`Restored the submodule ${m.name}.`);
}

async function installGitSubmodules() {
    try {
        const modules = await parseGitSubmodules();
        for (const m of Object.values(modules)) if (!(await isSubmoduleInstalled(m.path))) await installSubmodule(m);
    } catch (error) {
        console.error("Error:", error, "\n");
    }
}

module.exports = { installGitSubmodules };
