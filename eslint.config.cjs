// @ts-check

const js = require("@eslint/js");
const ts = require("typescript-eslint");
const prettierConfig = require("eslint-config-prettier");
const simpleImportSort = require("eslint-plugin-simple-import-sort");

module.exports = ts.config(
  {
    ignores: [
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
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: [
          "tsconfig.json",
          "tsconfig.main.json",
          "tsconfig.preload.json",
          "tsconfig.renderer.json",
        ],
        tsconfigRootDir: __dirname, //import.meta.dirname,
      },
    },
  },
);
