/*
 * Cargador de secretos externos.
 *
 * Lee `../prz-secrets/tokens.env` (FUERA del repo git) e inyecta los valores
 * como variables de entorno del proceso hijo. Uso:
 *
 *   node scripts/with-secrets.mjs -- wrangler d1 list
 *   node scripts/with-secrets.mjs --require CLOUDFLARE_API_TOKEN -- gh repo view
 *
 * Reglas de seguridad (no relajar):
 * - NUNCA imprime valores, ni siquiera parcialmente.
 * - Solo informa qué claves faltan (nombres, no valores).
 * - No escribe los secretos a ningún archivo ni log.
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

function loadSecrets() {
  if (!existsSync(SECRETS_FILE)) {
    console.error(`✗ No existe ${SECRETS_FILE}. Créalo a partir de la plantilla.`);
    process.exit(1);
  }
  const found = {};
  for (const line of readFileSync(SECRETS_FILE, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && value) found[key] = value;
  }
  return found;
}

const args = process.argv.slice(2);
const required = [];
let cmdIndex = args.indexOf("--");
if (args[0] === "--require") {
  required.push(...(args[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  cmdIndex = args.indexOf("--", 2);
}
const command = cmdIndex >= 0 ? args.slice(cmdIndex + 1) : [];

const secrets = loadSecrets();

const missing = required.filter((k) => !secrets[k]);
if (missing.length > 0) {
  console.error(`✗ Faltan claves en tokens.env: ${missing.join(", ")}`);
  process.exit(1);
}

if (command.length === 0) {
  // Sin comando: solo informa cuántas claves hay (sin mostrar valores).
  const names = Object.keys(secrets).sort();
  console.log(`✓ tokens.env cargado: ${names.length} clave(s) presente(s).`);
  console.log(`  Presentes: ${names.join(", ")}`);
  process.exit(0);
}

const [cmd, ...rest] = command;
const result = spawnSync(cmd, rest, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, ...secrets },
});
process.exit(result.status ?? 1);
