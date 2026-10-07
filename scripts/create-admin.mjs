/*
 * Crea (o actualiza) un usuario administrador.
 *
 *   npm run create-admin                    (base local)
 *   npm run create-admin -- --remote        (base remota de Cloudflare)
 *
 * Pide email, nombre y contraseña por consola. Si el email ya existe,
 * actualiza su contraseña y lo activa como admin.
 *
 * El hash usa los mismos parámetros que src/lib/auth/password.ts
 * (PBKDF2-SHA256, 100 000 iteraciones = máximo de Workers), así que el login lo acepta tal cual.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { d1Execute } from "./lib/run-wrangler.mjs";

const remote = process.argv.includes("--remote");
const flag = remote ? "--remote" : "--local";
const DB = "prz-tours";

const q = (v) =>
  v === null || v === undefined
    ? "NULL"
    : `'${String(v).replace(/'/g, "''")}'`;

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
  const b64 = (bytes) => Buffer.from(bytes).toString("base64");
  return `pbkdf2-sha256$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

function run(sql) {
  return d1Execute(DB, flag, sql);
}

const rl = createInterface({ input: stdin, output: stdout });

// Permite uso no interactivo (CI, scripts):
//   ADMIN_EMAIL=x ADMIN_NAME=y ADMIN_PASSWORD=z npm run create-admin
const email = (
  process.env.ADMIN_EMAIL ?? (await rl.question("Email: "))
)
  .trim()
  .toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("✗ Email inválido.");
  process.exit(1);
}
const name =
  process.env.ADMIN_NAME ?? ((await rl.question("Nombre: ")).trim() || "Admin");
const password =
  process.env.ADMIN_PASSWORD ?? (await rl.question("Contraseña (mínimo 8 caracteres): "));
if (password.length < 8) {
  console.error("✗ La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}
rl.close();

const passwordHash = await hashPassword(password);

const existing = run(`SELECT id FROM users WHERE email = ${q(email)};`);
const rows = existing?.[0]?.results ?? [];

if (rows.length > 0) {
  run(
    `UPDATE users SET name = ${q(name)}, password_hash = ${q(passwordHash)}, role = 'admin', is_active = 1, updated_at = datetime('now') WHERE email = ${q(email)};`,
  );
  console.log(`✓ Usuario ${email} actualizado como admin (${flag}).`);
} else {
  run(
    `INSERT INTO users (email, name, password_hash, role, is_active) VALUES (${q(email)}, ${q(name)}, ${q(passwordHash)}, 'admin', 1);`,
  );
  console.log(`✓ Admin ${email} creado (${flag}).`);
}

console.log(`  Entra en /login con ese email y contraseña.`);
