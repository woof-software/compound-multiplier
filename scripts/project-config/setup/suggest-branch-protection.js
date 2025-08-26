const { createPromptModule } = require("inquirer");
const { execSync } = require("child_process");

// Branches to apply protection rules to
const branches = ["main", "dev"]; // extend this list if you add long‑lived branches
const token = process.env.GITHUB_TOKEN;

async function suggestBranchProtection() {
    const question = [
        {
            type: "confirm",
            name: "protection",
            message: `Do you need Branch Protection for 'main' and 'dev'?`,
            default: true
        }
    ];
    const prompt = createPromptModule();
    const answer = await prompt(question);

    if (answer.protection) {
        for (const branch of branches) {
            await setBranchProtection(branch);
        }
    }
}

async function setBranchProtection(branch) {
    if (!token) {
        console.error("❌ GITHUB_TOKEN environment variable is not set.");
        process.exit(1);
    }

    // Auto-detect owner and repo from git remote URL
    let remoteUrl;
    try {
        remoteUrl = execSync("git config --get remote.origin.url").toString().trim();
    } catch (e) {
        console.error("❌ Failed to get git remote URL:", e.message);
        process.exit(1);
    }

    const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
    if (!match) {
        console.error("❌ Could not parse owner and repo from remote URL:", remoteUrl);
        process.exit(1);
    }

    const [, owner, repo] = match;

    const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`;

    console.log(`🔧 Applying branch protection to ${owner}/${repo}@${branch}...`);

    // NOTE: required_status_checks.contexts must match the exact check run names shown in the
    // Branch Protection UI. For GitHub Actions they are typically in the form
    // "<workflow name> / <job id>". Adjust if your workflow/job names change.
    // If you want admins to bypass (push/merge without PR) set enforce_admins to false.
    // Non-admins will still need a PR approved by a CODEOWNER (repo admin) and passing checks.
    const body = {
        required_status_checks: {
            strict: true,
            contexts: [
                "Testing / test", // from .github/workflows/test.yml (job id: test)
                "Linting / lint", // from .github/workflows/lint.yml (job id: lint)
                "PR Title Check / check-title" // from .github/workflows/pr-lint.yml (job id: check-title)
            ]
        },
        enforce_admins: false, // admins can push/merge directly; protections apply only to non-admins
        required_pull_request_reviews: {
            dismiss_stale_reviews: true,
            required_approving_review_count: 1,
            require_code_owner_reviews: true // ensures an admin/code owner approves non-admin PRs
        },
        restrictions: null,
        allow_force_pushes: false,
        allow_deletions: false,
        required_conversation_resolution: true,
        lock_branch: false
    };

    fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
        .then((res) => {
            if (!res.ok) {
                return res.text().then((text) => {
                    throw new Error(`GitHub API Error: ${res.status} ${res.statusText}\n${text}`);
                });
            }
            return res.json();
        })
        .then(() => {
            console.log(`✅ Branch protection applied successfully to ${branch}!`);
            console.log("🔐 Applied settings: ", JSON.stringify(body, null, 2));
        })
        .catch((err) => {
            console.error(`❌ Failed to apply branch protection to ${branch}:`, err.message);
            process.exit(1);
        });
}

module.exports = { suggestBranchProtection };
