/*
 * Genera una cookie de sesión válida para el admin local (solo desarrollo).
 * Imprime el valor para usarlo con curl:
 *
 *   node scripts/dev-session.mjs
 *
 * Requiere que exista el usuario admin (npm run create-admin).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { d1Execute } from "./lib/run-wrangler.mjs";

function loadDevVars() {
  try {
    const text = readFileSync(".dev.vars", "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim();
    }
  } catch { /* sin .dev.vars */ }
}
loadDevVars();

const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 32) {
  console.error("AUTH_SECRET ausente en .dev.vars");
  process.exit(1);
}

const found = d1Execute(
  "prz-tours",
  "--local",
  "SELECT id, role FROM users WHERE email = 'admin@pereztours.local';",
);
const user = found?.[0]?.results?.[0];
if (!user) {
  console.error("No existe admin@pereztours.local. Corre npm run create-admin primero.");
  process.exit(1);
}

const sid = randomUUID();
d1Execute(
  "prz-tours",
  "--local",
  `INSERT INTO sessions (id, user_id, expires_at) VALUES ('${sid}', ${user.id}, datetime('now', '+7 days'));`,
);

const token = await new SignJWT({ uid: user.id, role: user.role, sid })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(new TextEncoder().encode(secret));

console.log(`prz_session=${token}`);
