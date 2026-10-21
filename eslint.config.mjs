import js from "@eslint/js";
import parser from "@typescript-eslint/parser";
import plugin from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "node_modules/**", "src/default/**", "src/axios/**", "src/generate-entities.ts", "src/app.controller.ts", "src/app.controller.spec.ts", "test/phase-one-database.spec.ts", "test/controller-layering.spec.ts", "test/jest.setup.ts"] },
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "test/chat*.spec.ts"],
    languageOptions: {
      parser,
      parserOptions: { project: "./tsconfig.json", sourceType: "module" },
      globals: {
        console: "readonly", process: "readonly", __dirname: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly",
        describe: "readonly", it: "readonly", expect: "readonly", jest: "readonly",
        beforeAll: "readonly", afterAll: "readonly", beforeEach: "readonly"
      }
    },
    plugins: { "@typescript-eslint": plugin },
    rules: {
      ...plugin.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error"
    }
  },
  prettier
];
