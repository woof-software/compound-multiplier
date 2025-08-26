const { exec } = require("child_process");

async function execAsync(cmd, errMsg = "") {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) reject(errMsg ? `${errMsg}: ${stderr}\n` : `${stderr}\n`);
            else resolve(stdout);
        });
    });
}

module.exports = { execAsync };
