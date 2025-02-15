import pluginJs from "@eslint/js";
import pluginN from "eslint-plugin-n";
import pluginImport from "eslint-plugin-import";
import * as espree from "espree";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: espree,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        allowImportExportEverywhere: true,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
      noInlineConfig: false,
    },
    plugins: {
      import: pluginImport,
      n: pluginN, // Add this line to register the 'n' plugin
    },
    rules: {
      // Override all rules to be warnings
      "no-unused-vars": "warn",
      "no-console": "warn",
      "import/no-unresolved": "warn",
      "import/named": "warn",
      "import/default": "warn",
      "import/namespace": "warn",
      "import/export": "warn",
      "import/no-named-as-default": "warn",
      "import/no-named-as-default-member": "warn",
      "import/no-duplicates": "warn",
      "import/first": "warn",
      "import/no-mutable-exports": "warn",
      "n/no-missing-import": "warn",
      "n/no-missing-require": "warn",
      // Override parser errors to be warnings
      "n/no-unsupported-features/es-syntax": [
        "warn",
        {
          version: "latest",
          ignores: ["modules"],
        },
      ],
    },
  },
  // Override the recommended configs to use warnings
  {
    rules: {
      ...Object.fromEntries(
        Object.entries(pluginJs.configs.recommended.rules || {}).map(
          ([key, value]) => [key, "warn"],
        ),
      ),
    },
  },
  {
    rules: {
      ...Object.fromEntries(
        Object.entries(pluginN.configs["flat/recommended"].rules || {}).map(
          ([key, value]) => [key, "warn"],
        ),
      ),
    },
  },
];
