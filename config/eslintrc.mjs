import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("eslint:recommended", "plugin:jsdoc/recommended"), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        ecmaVersion: 8,
        sourceType: "module",
    },

    settings: {
        jsdoc: {
            tagNamePreference: {
                augments: "extends",
            },
        },
    },

    rules: {
        "no-unused-vars": ["warn"],
        "no-prototype-builtins": ["warn"],

        "jsdoc/require-jsdoc": ["error", {
            publicOnly: true,
            checkSetters: false,

            require: {
                ClassDeclaration: true,
                MethodDefinition: true,
            },
        }],

        "jsdoc/multiline-blocks": ["warn", {
            noZeroLineText: false,
        }],

        "jsdoc/tag-lines": ["warn", "any"],
    },
}];
