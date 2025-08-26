const { readFile, unlink } = require("fs").promises;

async function removeTemplateLicense() {
    const licensePath = `${process.cwd()}/LICENSE`;
    try {
        const data = await readFile(licensePath, "utf8");
        if (data.includes("Copyright (c) 2024 Yurii721")) await unlink(licensePath);
    } catch (err) {
        console.error(`Error when removing the template's license: ${err.message}\n`);
    }
}

module.exports = { removeTemplateLicense };
