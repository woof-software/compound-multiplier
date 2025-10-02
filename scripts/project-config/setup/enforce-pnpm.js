const { execSync } = require("child_process");

function isOnlyAllowAvailable() {
    try {
        execSync("npx only-allow", { stdio: "pipe", encoding: "utf-8" });
    } catch (error) {
        /* It is assumed that if `only-allow` is available, its output includes something like
         * "Please specify the wanted package manager: only-allow <npm|cnpm|pnpm|yarn|bun>".
         */
        if (error.stdout && error.stdout.includes("pnpm")) return true;
        return false;
    }
}

function enforcePNPMPackageManager() {
    if (!isOnlyAllowAvailable()) {
        console.warn("`only-allow` is not available. The package manager enforcement skipped.");
        return;
    }

    try {
        execSync("npx -y only-allow pnpm", { stdio: "inherit", env: { ...process.env, npm_config_loglevel: "error" } });
    } catch (error) {
        console.error("Error when enforcing `pnpm` as the package manager:", error, "\n");
        process.exit(1);
    }
}

module.exports = { enforcePNPMPackageManager };
