/**
 * Genera el par de claves VAPID para las notificaciones push.
 *
 * Uso:  node scripts/gen-vapid.mjs
 *
 * Imprime PUBLIC y PRIVATE. La pública va al cliente (se expone por
 * /api/push/public-key); la privada es un secreto de Cloudflare:
 *   node scripts/with-secrets.mjs -- npx wrangler secret put VAPID_PRIVATE_KEY
 *   node scripts/with-secrets.mjs -- npx wrangler secret put VAPID_PUBLIC_KEY
 *
 * Guarda también un .vapid.local (ignorado por git) para no perderlas.
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";

import webpush from "web-push";

const FILE = ".vapid.local";

if (existsSync(FILE)) {
  console.log("Ya existen claves en %s. Bórralo para generar otras.\n", FILE);
  const keys = JSON.parse(readFileSync(FILE, "utf8"));
  console.log("PUBLIC=%s\nPRIVATE=%s", keys.publicKey, keys.privateKey);
  process.exit(0);
}

const keys = webpush.generateVAPIDKeys();

writeFileSync(FILE, `${JSON.stringify(keys, null, 2)}\n`, "utf8");

console.log("Claves VAPID generadas en %s\n", FILE);
console.log("PUBLIC=%s", keys.publicKey);
console.log("PRIVATE=%s", keys.privateKey);
console.log("\nSúbelas a Cloudflare:");
console.log("  node scripts/with-secrets.mjs -- npx wrangler secret put VAPID_PUBLIC_KEY");
console.log("  node scripts/with-secrets.mjs -- npx wrangler secret put VAPID_PRIVATE_KEY");
console.log("Y a .dev.vars para desarrollo local.");