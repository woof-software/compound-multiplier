import type { UserConfig } from "@commitlint/types";
import { RuleConfigSeverity } from "@commitlint/types";

const Configuration: UserConfig = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [
            RuleConfigSeverity.Error,
            "always",
            ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test", "merge"]
        ],
        "subject-case": [RuleConfigSeverity.Error, "always", ["sentence-case"]],
        "header-max-length": [RuleConfigSeverity.Error, "always", 72]
    }
};

export default Configuration;
