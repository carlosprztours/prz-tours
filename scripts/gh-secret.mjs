/*
 * Define un secret de GitHub Actions leyendo el valor de tokens.env.
 *
 *   node scripts/gh-secret.mjs CLOUDFLARE_API_TOKEN [--repo owner/name]
 *
 * El valor viaja como argumento (los tokens no llevan espacios) y nunca se
 * imprime. Requiere GITHUB_TOKEN en tokens.env.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SECRETS_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "prz-secrets",
  "tokens.env",
);

const name = process.argv[2];
let repo = "carlosprztours/prz-tours";
const repoIdx = process.argv.indexOf("--repo");
if (repoIdx >= 0 && process.argv[repoIdx + 1]) repo = process.argv[repoIdx + 1];

if (!name || !/^[A-Z0-9_]+$/.test(name)) {
  console.error("Uso: node scripts/gh-secret.mjs NOMBRE_DEL_SECRET [--repo owner/name]");
  process.exit(1);
}

if (!existsSync(SECRETS_FILE)) {
  console.error("✗ No existe tokens.env");
  process.exit(1);
}

let value = "";
let githubToken = "";
for (const line of readFileSync(SECRETS_FILE, "utf8").split("\n")) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m || line.trim().startsWith("#")) continue;
  if (m[1] === name) value = m[2].trim();
  if (m[1] === "GITHUB_TOKEN") githubToken = m[2].trim();
}

if (!value) {
  console.error(`✗ ${name} vacío en tokens.env`);
  process.exit(1);
}
if (!githubToken) {
  console.error("✗ GITHUB_TOKEN vacío en tokens.env");
  process.exit(1);
}

const result = spawnSync(
  "gh",
  ["secret", "set", name, "--repo", repo, "--body", value],
  { encoding: "utf8", env: { ...process.env, GITHUB_TOKEN: githubToken, GH_TOKEN: githubToken } },
);

if (result.status !== 0) {
  process.stderr.write((result.stderr || result.stdout || "error").replaceAll(value, "***").replaceAll(githubToken, "***"));
  process.exit(result.status ?? 1);
}
console.log(`✓ Secret ${name} configurado en ${repo}.`);
