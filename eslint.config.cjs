// @ts-check

const js = require("@eslint/js");
const ts = require("typescript-eslint");
const prettierConfig = require("eslint-config-prettier");
const simpleImportSort = require("eslint-plugin-simple-import-sort");
const reactHooks = require("eslint-plugin-react-hooks");
const reactRefresh = require("eslint-plugin-react-refresh");

module.exports = ts.config(
  {
    ignores: [
      "_data/",
      "**/.vite/",
      "**/.yarn/",
      "**/out/",
      "**/.pnp.*",
      "eslint.config.cjs",
      "eslint.config.mjs",
    ],
  },
  js.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  prettierConfig,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "warn",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    rules: {
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        {
          ignoreArrowShorthand: true,
          ignoreVoidOperator: true,
        },
      ],
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true },
      ],
      // not compatible with specifying void return types via generics
      // see also https://github.com/typescript-eslint/typescript-eslint/issues/8113
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          // reportUsedIgnorePattern: true,
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: true,
        },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        // typescript-eslint specific options
        warnOnUnsupportedTypeScriptVersion: true,
        projectService: true,
      },
    },
  },
);
