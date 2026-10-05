/**
 * Sincroniza secretos de `.dev.vars` con los valores de producción.
 *
 * Uso:  node scripts/sync-dev-vars.mjs
 *
 * Solo actualiza valores ya presentes en el archivo: nunca añade secretos
 * nuevos ni imprime sus valores. Pensado para el momento en que se cambia el
 * remitente del correo o se regenera una clave.
 */
import { readFileSync, writeFileSync } from "node:fs";

/** Valores a sincronizar: clave → valor nuevo. */
const VALUES = {
  RESEND_FROM: "Perez Tours & Transfers <reservas@perez-tours.com>",
};

let env = readFileSync(".dev.vars", "utf8");
let changed = [];

for (const [key, value] of Object.entries(VALUES)) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) {
    env = env.replace(re, line);
    changed.push(key);
  } else {
    console.log(`· ${key} no está en .dev.vars; se deja como está`);
  }
}

if (changed.length > 0) {
  writeFileSync(".dev.vars", env, "utf8");
  console.log(`Actualizados en .dev.vars: ${changed.join(", ")}`);
}