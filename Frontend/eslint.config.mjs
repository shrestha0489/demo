import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
  },
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    ...pluginJs.configs.recommended,
    rules: {
      ...pluginJs.configs.recommended.rules,
      "no-unused-vars": "warn", // Example: Change 'no-unused-vars' to warning
      "no-console": "warn",
    },
  },
  {
    ...pluginReact.configs.flat.recommended,
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      "react/prop-types": "warn", // Example: Change 'react/prop-types' to warning
    },
  },
  {
    settings: {
      react: {
        version: "detect", // Automatically detects the version of React
      },
    },
  },
];