import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Salida de OpenNext/workerd (bundle gigante, revienta ESLint):
    ".open-next/**",
    ".wrangler/**",
    // Estado local de D1/R2:
    "*.sqlite*",
    "*.db*",
  ]),
]);

export default eslintConfig;
