import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [
      js.configs.recommended,
      importPlugin.flatConfigs.recommended,
      ...tseslint.configs.recommended
    ],

    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    settings: {
      "import/resolver": {
        typescript: {}
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "import/no-unused-modules": "error",
      "no-unused-vars": "warn",
      "import/order": [
        "error",
        {
          alphabetize: {
            order: "asc",
            caseInsensitive: true
          },
          "newlines-between": "always",
          groups: ["builtin", "external", "parent", "sibling", "index"],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before"
            }
          ],
          pathGroupsExcludedImportTypes: ["builtin"]
        }
      ]
    }
  }
);
