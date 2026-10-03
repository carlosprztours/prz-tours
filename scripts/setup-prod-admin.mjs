/*
 * Crea el administrador inicial en PRODUCCIÓN.
 *
 * Genera una contraseña segura, la guarda en tokens.env (PROD_ADMIN_PASSWORD)
 * y crea el usuario admin. La contraseña se muestra UNA VEZ por pantalla para
 * entregarla al dueño; después vive solo en tokens.env.
 *
 *   node scripts/setup-prod-admin.mjs [email] [nombre]
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

const email = (process.argv[2] ?? "carlosdavidpere@gmail.com").trim().toLowerCase();
const name = process.argv[3] ?? "Carlos Perez";

if (!existsSync(SECRETS_FILE)) {
  console.error("✗ No existe tokens.env");
  process.exit(1);
}

let text = readFileSync(SECRETS_FILE, "utf8");

// Contraseña de 20 caracteres (letras + dígitos, sin símbolos conflictivos).
const password = randomBytes(15).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 20).padEnd(20, "7Kp");

if (/^PROD_ADMIN_PASSWORD=.*$/m.test(text)) {
  text = text.replace(/^PROD_ADMIN_PASSWORD=.*$/m, `PROD_ADMIN_PASSWORD=${password}`);
} else {
  text = text.replace("AUTH_SECRET=", `PROD_ADMIN_PASSWORD=${password}\nAUTH_SECRET=`);
}
writeFileSync(SECRETS_FILE, text, "utf8");

const env = { ...process.env };
for (const line of text.split("\n")) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !line.trim().startsWith("#") && m[2].trim()) env[m[1]] = m[2].trim();
}
env.ADMIN_EMAIL = email;
env.ADMIN_NAME = name;
env.ADMIN_PASSWORD = password;

const create = spawnSync("node", ["scripts/create-admin.mjs", "--remote"], {
  encoding: "utf8",
  env,
  cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
});

process.stdout.write(create.stdout ?? "");
process.stderr.write(create.stderr ?? "");
if (create.status !== 0) process.exit(create.status ?? 1);

console.log("\n===============================================");
console.log(`Admin de producción creado: ${email}`);
console.log(`Contraseña (cámbiala tras entrar): ${password}`);
console.log("===============================================");
console.log("Guardada también en tokens.env como PROD_ADMIN_PASSWORD.");
