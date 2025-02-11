import pluginJs from "@eslint/js";
import pluginNode from "eslint-plugin-node";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs}"],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
    },
  },
  {
    ...pluginJs.configs.recommended,
    rules: {
      ...pluginJs.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-console": "off", // Allow console logs in backend
    },
  },
  {
    ...pluginNode.configs.recommended, // Enforce Node.js best practices
  },
];