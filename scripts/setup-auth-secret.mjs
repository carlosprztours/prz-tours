/*
 * Genera AUTH_SECRET, lo guarda en tokens.env y lo define en el Worker.
 *
 *   node scripts/setup-auth-secret.mjs
 *
 * - Si tokens.env ya tiene AUTH_SECRET válido (≥32 car.), solo hace el
 *   `wrangler secret put` (idempotente, no muestra el valor).
 * - Requiere CLOUDFLARE_API_TOKEN en tokens.env.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
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

if (!existsSync(SECRETS_FILE)) {
  console.error("✗ No existe tokens.env");
  process.exit(1);
}

let text = readFileSync(SECRETS_FILE, "utf8");
const get = (key) => {
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  const v = m ? m[1].trim() : "";
  return v && !v.startsWith("#") ? v : "";
};

let secret = get("AUTH_SECRET");
if (secret.length < 32) {
  secret = randomBytes(48).toString("base64");
  if (/^AUTH_SECRET=.*$/m.test(text)) {
    text = text.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${secret}`);
  } else {
    text = text.replace(
      "AUTH_SECRET=",
      `AUTH_SECRET=${secret}`,
    );
  }
  writeFileSync(SECRETS_FILE, text, "utf8");
  console.log("✓ AUTH_SECRET generado y guardado en tokens.env (no se muestra).");
} else {
  console.log("✓ AUTH_SECRET ya existe en tokens.env (se reutiliza).");
}

const token = get("CLOUDFLARE_API_TOKEN");
const accountId = get("CLOUDFLARE_ACCOUNT_ID");
if (!token) {
  console.error("✗ Falta CLOUDFLARE_API_TOKEN en tokens.env");
  process.exit(1);
}
if (!accountId) {
  console.error("✗ Falta CLOUDFLARE_ACCOUNT_ID en tokens.env");
  process.exit(1);
}

// wrangler secret put lee de stdin. El `input` de spawnSync no atraviesa
// bien cmd.exe, así que se hace pipe vía PowerShell (el secreto viaja por
// stdin, nunca en argv ni en logs).
// IMPORTANTE: se pasan token Y account ID juntos. Con solo el token,
// wrangler mezcla la cuenta del login oauth local y la API responde 10000.
let put;
if (process.platform === "win32") {
  put = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", "$input | npx.cmd wrangler secret put AUTH_SECRET"],
    {
      input: secret,
      encoding: "utf8",
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ACCOUNT_ID: accountId,
      },
    },
  );
} else {
  console.log("  Ejecuta en tu terminal: echo <secreto> | npx wrangler secret put AUTH_SECRET");
  console.log("  (El secreto ya quedó guardado en tokens.env.)");
  process.exit(0);
}

if (put.status !== 0) {
  console.error("✗ No se pudo definir el secreto en el Worker.");
  process.exit(put.status ?? 1);
}
console.log("✓ AUTH_SECRET definido en el Worker prz-tours.");
