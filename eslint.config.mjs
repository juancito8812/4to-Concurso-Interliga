import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Configuración para scripts/*.js (Node CommonJS). Estos scripts corren en Node
// (cron/CI), usan require() y dependen de globals de Node — el config de Next
// asume ESM/React y generaría falsos positivos si se aplicara aquí.
const nodeScripts = {
  files: ["scripts/**/*.js"],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "commonjs",
    globals: {
      require: "readonly",
      module: "readonly",
      exports: "readonly",
      process: "readonly",
      console: "readonly",
      setTimeout: "readonly",
      __dirname: "readonly",
      AbortSignal: "readonly",
      fetch: "readonly",
    },
  },
  rules: {
    "@typescript-eslint/no-require-imports": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // scripts/ now has its own config below (no longer ignored).
  ]),
  nodeScripts,
]);

export default eslintConfig;