// @ts-check

import eslintJS from "@eslint/js";
import eslintPrettierConfig from "eslint-config-prettier";
import eslintTS from "typescript-eslint";
import { includeIgnoreFile } from "@eslint/compat";
import globals from "globals";
import path from "path";

export default eslintTS.config(
    { ignores: ["ignition/deployments/**/*"] },
    { files: ["**/*.{ts,js}"] },
    eslintJS.configs.recommended,
    ...eslintTS.configs.strictTypeChecked,
    ...eslintTS.configs.stylisticTypeChecked,
    {
        rules: {
            quotes: ["error", "double"],
            "eol-last": ["error"],
            "no-trailing-spaces": ["error"]
        }
    },
    {
        files: ["test/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unused-expressions": "off",
            "no-restricted-properties": [
                "warn",
                {
                    object: "describe",
                    property: "only",
                    message: "Please, remember to remove `.only` before committing."
                },
                {
                    object: "context",
                    property: "only",
                    message: "Please, remember to remove `.only` before committing."
                },
                {
                    object: "it",
                    property: "only",
                    message: "Please, remember to remove `.only` before committing."
                }
            ]
        }
    },
    eslintPrettierConfig,
    {
        languageOptions: {
            globals: {
                ...globals.es2020,
                ...globals.mocha,
                ...globals.chai,
                ...globals.node,
                artifacts: "readonly",
                contract: "readonly",
                extendEnvironment: "readonly",
                expect: "readonly"
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    {
        files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
        extends: [eslintTS.configs.disableTypeChecked]
    },
    {
        files: ["**/*.js"],
        languageOptions: { sourceType: "commonjs" },
        rules: {
            "@typescript-eslint/no-require-imports": "off"
        }
    },
    includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore"))
);
