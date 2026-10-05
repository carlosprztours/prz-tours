/**
 * Comprueba que el envío real de correo funciona con el dominio propio.
 *
 * Uso:  node scripts/test-email.mjs
 *
 * Usa el `RESEND_API_TOKEN` y el `RESEND_FROM` de `.dev.vars` (el mismo token
 * está cargado como secreto en el Worker, así que lo que se prueba aquí es
 * exactamente lo que envía producción). NO imprime claves.
 */
import { readFileSync } from "node:fs";

function devVar(key) {
  const line = readFileSync(".dev.vars", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : "";
}

const apiKey = devVar("RESEND_API_TOKEN");
const from = devVar("RESEND_FROM");

if (!apiKey || !from) {
  console.error("Falta RESEND_API_TOKEN o RESEND_FROM en .dev.vars");
  process.exit(2);
}

console.log(`Remitente: ${from}\n`);

const targets = [
  "asistencia@perez-tours.com",
  "pereztoursandtransfer@gmail.com",
];

let failures = 0;
for (const to of targets) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Prueba de correo · Perez Tours",
        html: "<p>Prueba de envío desde el dominio propio.</p>",
        text: "Prueba de envío desde el dominio propio.",
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`OK    ${to}  id=${body.id}`);
    } else {
      failures += 1;
      console.log(`FALLO ${to}  ${res.status}  ${body.message ?? ""}`);
    }
  } catch (err) {
    failures += 1;
    console.log(`FALLO ${to}  ${String(err).slice(0, 120)}`);
  }
}

process.exit(failures > 0 ? 1 : 0);