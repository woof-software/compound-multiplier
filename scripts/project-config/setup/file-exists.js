const { access } = require("fs").promises;

async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

module.exports = { fileExists };
