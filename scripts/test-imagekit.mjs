/**
 * Comprueba que la subida de imágenes a ImageKit funciona de verdad.
 *
 * Uso:  node scripts/test-imagekit.mjs
 *
 * Lee `IMAGEKIT_PRIVATE_KEY` e `IMAGEKIT_URL_ENDPOINT` de `.dev.vars` (los
 * mismos valores que hay como secretos en el Worker). Sube un PNG de prueba,
 * verifica que la URL devuelta responde una imagen y **borra el fichero** al
 * terminar, para no dejar basura en la cuenta.
 *
 * NO imprime la clave privada. Sale con código 1 si algo falla.
 */
import { readFileSync } from "node:fs";

function devVar(key) {
  const line = readFileSync(".dev.vars", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : "";
}

const privateKey = devVar("IMAGEKIT_PRIVATE_KEY");
const urlEndpoint = devVar("IMAGEKIT_URL_ENDPOINT").replace(/\/+$/, "");

if (!privateKey || !urlEndpoint) {
  console.error(
    "Falta IMAGEKIT_PRIVATE_KEY o IMAGEKIT_URL_ENDPOINT en .dev.vars.\n" +
      "Dashboard de ImageKit → Developer Options → API Keys.",
  );
  process.exit(2);
}

console.log(`Endpoint: ${urlEndpoint}\n`);

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** PNG de 2x2 en rojo. Pequeño y válido, para no gastar cuota. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z4AATAxIYBRQAgB8oMvwAAAABJRU5ErkJggg==",
  "base64",
);

const auth = `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
const folder = "prz/pruebas";
const fileName = `prueba-${Date.now()}.png`;

let fileId = null;

try {
  // ── 1) Subida ────────────────────────────────────────────────────────────
  const form = new FormData();
  form.append("file", new Blob([PNG], { type: "image/png" }), fileName);
  form.append("fileName", fileName);
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: auth },
    body: form,
  });
  const raw = await res.text();
  const body = raw ? JSON.parse(raw) : {};

  // Dos formas de respuesta: { success, file: {...} } y la plana { url, ... }.
  const file = body.file ?? body;

  check(
    "la API acepta la subida",
    res.ok && body.success !== false,
    res.ok ? "" : `${res.status} ${raw.slice(0, 200)}`,
  );

  const url = file.url ?? "";
  fileId = file.id ?? body.fileId ?? null;

  check("devuelve URL pública", Boolean(url), url.slice(0, 90));
  check(
    "la URL usa el endpoint configurado",
    url.startsWith(urlEndpoint),
    url.startsWith(urlEndpoint) ? "" : `esperaba ${urlEndpoint}`,
  );
  check("devuelve miniatura", Boolean(file.thumbnailUrl));
  check("devuelve id de fichero", Boolean(fileId));

  // ── 2) La URL sirve una imagen de verdad ────────────────────────────────
  if (url) {
    const img = await fetch(url, { redirect: "follow" }).catch(() => null);
    check(
      "la URL pública responde",
      img !== null && img.ok,
      img ? `HTTP ${img.status} · ${img.headers.get("content-type")}` : "sin respuesta",
    );
    check(
      "sirve una imagen",
      (img?.headers.get("content-type") ?? "").startsWith("image/"),
      img?.headers.get("content-type") ?? "",
    );
  }
} catch (err) {
  check("sin errores inesperados", false, String(err).slice(0, 160));
} finally {
  // ── 3) Limpieza: borrar el fichero para no dejar basura ─────────────────
  if (fileId) {
    const del = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: auth },
    }).catch(() => null);
    check("borra el fichero de prueba", del?.ok === true, del ? `HTTP ${del.status}` : "");
  }
}

const fallos = results.filter((r) => !r).length;
console.log(`\n${results.length - fallos}/${results.length} checks OK`);
process.exit(fallos > 0 ? 1 : 0);