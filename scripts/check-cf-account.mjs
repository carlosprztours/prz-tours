/*
 * Verifica que CLOUDFLARE_ACCOUNT_ID corresponde a la cuenta del token.
 * No imprime ningún valor sensible, solo el resultado.
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

const secrets = {};
for (const line of readFileSync(SECRETS_FILE, "utf8").split("\n")) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !line.trim().startsWith("#") && m[2].trim()) secrets[m[1]] = m[2].trim();
}

const r = spawnSync("wrangler", ["whoami"], {
  encoding: "utf8",
  shell: process.platform === "win32",
  env: { ...process.env, ...secrets },
});
const out = (r.stdout || "") + (r.stderr || "");
const ids = [...out.matchAll(/[0-9a-f]{32}/g)].map((m) => m[0]);
const unique = [...new Set(ids)];
const configured = secrets.CLOUDFLARE_ACCOUNT_ID ?? "";

console.log(`Cuentas vistas con el token: ${unique.length}`);
console.log(
  configured && unique.includes(configured)
    ? "✓ CLOUDFLARE_ACCOUNT_ID coincide con la cuenta del token."
    : "✗ CLOUDFLARE_ACCOUNT_ID NO coincide con la cuenta del token.",
);
if (!unique.includes(configured)) {
  console.log("  Revisa el Account ID en el dashboard de Cloudflare (Workers → Overview).");
  process.exit(1);
}
