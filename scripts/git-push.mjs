/*
 * Push a GitHub usando el GITHUB_TOKEN de tokens.env (uso puntual).
 *
 * `git push` no lee GITHUB_TOKEN del entorno (usa el credential helper de
 * Windows, que aquí tiene otra cuenta). Este script inyecta el token solo en
 * la URL del push y NUNCA lo guarda en .git/config.
 *
 * Si git imprime la URL en un error, el token se redacta antes de mostrar.
 *
 *   node scripts/git-push.mjs [rama]   (por defecto: main)
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

function getToken() {
  if (!existsSync(SECRETS_FILE)) {
    console.error("✗ No existe tokens.env");
    process.exit(1);
  }
  for (const line of readFileSync(SECRETS_FILE, "utf8").split("\n")) {
    const m = line.trim().match(/^GITHUB_TOKEN=(.+)$/);
    if (m) return m[1].trim();
  }
  console.error("✗ GITHUB_TOKEN vacío en tokens.env");
  process.exit(1);
}

const branch = process.argv[2] ?? "main";
const token = getToken();

const REMOTE_URL = "https://github.com/carlosprztours/prz-tours.git";
const AUTH_URL = `https://x-access-token:${token}@github.com/carlosprztours/prz-tours.git`;

const redact = (s) => s.split(token).join("***");

function run(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.stdout) process.stdout.write(redact(result.stdout));
  if (result.stderr) process.stderr.write(redact(result.stderr));
  return result.status ?? 1;
}

// 1) Push con el token solo en la URL (no se guarda en .git/config).
let status = run(["push", AUTH_URL, `${branch}:${branch}`]);
if (status !== 0) process.exit(status);

// 2) El remoto `origin` queda con la URL limpia; se fija el tracking.
status = run(["branch", "--set-upstream-to=origin/main", branch]);
console.log(`(remoto configurado: ${REMOTE_URL})`);
process.exit(status);
