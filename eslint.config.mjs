import * as myPlugin from "@ota-meshi/eslint-plugin";
// import * as tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/coverage/",
      "**/.nyc_output/",
      "!**/.changeset/",
      "!**/.github/",
      "!**/.vscode/",
    ],
  },
  ...myPlugin.config({
    node: true,
    json: true,
    yaml: true,
    prettier: true,
    ts: true,
  }),
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },

    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/unbound-method": "off",
      "func-style": "off",

      "n/no-unsupported-features/node-builtins": "off",
      complexity: "off",
    },
  },
  {
    files: ["**/*.ts"],

    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
  },
  {
    files: ["tools/**/*.ts"],

    rules: {
      "require-jsdoc": "off",
    },
  },
];
