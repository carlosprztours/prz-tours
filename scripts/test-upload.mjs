/**
 * Prueba de extremo a extremo de la subida de imágenes desde el panel.
 *
 * Uso:  node scripts/test-upload.mjs [origen]
 *
 * Entra al panel con el usuario de pruebas, sube una imagen REAL por el botón
 * «Subir foto» de la galería, comprueba que la URL que se escribe en el
 * formulario es de ImageKit, que la imagen carga en la web y que el borrador
 * se puede guardar.
 *
 * Al terminar borra la fila de la galería y el fichero de ImageKit, así que no
 * deja rastro ni en la base de datos ni en la cuenta de ImageKit. Para eso
 * necesita la clave privada de `.dev.vars`; si no está, avisa y deja la foto
 * puesta para poder borrarla a mano desde el panel.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
];
const executablePath = EDGE_PATHS.find((p) => existsSync(p));
if (!executablePath) {
  console.error("FAIL  no se encontró Edge");
  process.exit(2);
}

const origin = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const USER = process.env.PRZE_USER ?? "dev@suprime.xyz";
const PASS = process.env.PRZE_PASS ?? "Ultra1255";

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * PNG 3x2 válido, generado en base64. Basta para comprobar el recorrido: lo
 * que importa es que viaje entero y vuelva una URL que sirva una imagen.
 */
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAF0lEQVR42u3OMQEAAAgDoC251a3gLwSgcrfTBgQCgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAoFAIBAIBAKBQCAQCAQOgAB1YkZ2QAAAABJRU5ErkJggg==";
const tmp = mkdtempSync(join(tmpdir(), "prz-upload-"));
const imagePath = join(tmp, "prueba-imagekit.png");
writeFileSync(imagePath, Buffer.from(PNG_B64, "base64"));

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0].slice(0, 160)));

/** URL de la imagen subida y su id en ImageKit, para poder limpiarla. */
let uploadedUrl = "";
let uploadedFileId = null;

try {
  // ── Sesión ──────────────────────────────────────────────────────────────
  await page.goto(`${origin}/es/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#email").fill(USER);
  await page.locator("#password").fill(PASS);
  // Varios botones pueden decir «entrar» (el del formulario y el de Google),
  // así que nos quedamos con el que está dentro del formulario de contraseña.
  await page
    .locator("form")
    .filter({ has: page.locator("#password") })
    .getByRole("button", { name: /entrar|log in|sign in/i })
    .first()
    .click();
  await page.waitForURL(/\/es\/(admin|cuenta|account)/, { timeout: 45000 });
  check("login en el panel", true, page.url().replace(origin, ""));

  // ── Galería ─────────────────────────────────────────────────────────────
  await page.goto(`${origin}/es/admin/gallery`, { waitUntil: "networkidle", timeout: 60000 });
  check("abre la galería", await page.getByRole("heading", { name: /galer|galle/i }).first().isVisible());

  const fileInput = page.locator('input[type="file"]').first();

  // La API devuelve el `fileId` de ImageKit. Lo escuchamos para poder borrar
  // el fichero al terminar: la API de listado no está disponible con la clave
  // privada, pero el borrado por id sí.
  page.on("response", async (res) => {
    if (!res.url().includes("/api/admin/upload") || !res.ok()) return;
    const body = await res.json().catch(() => null);
    if (body?.fileId) uploadedFileId = body.fileId;
  });

  await fileInput.setInputFiles(imagePath);

  // El botón se pone en «Subiendo…» mientras va; esperamos a que la URL llegue
  // al campo en vez de a un tiempo fijo.
  const urlField = page.locator("#gallery-url");
  await urlField.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(
    () => {
      const el = document.getElementById("gallery-url");
      return el && el.value.trim().length > 0;
    },
    { timeout: 60000 },
  );
  const url = await urlField.inputValue();
  uploadedUrl = url;
  console.log(`      url: ${url}`);

  check("la subida devuelve una URL", Boolean(url), url.slice(0, 90));
  check(
    "la URL es de ImageKit",
    /^https:\/\/[^/]+\.imagekit\.io\//.test(url),
    url ? url.split("/")[2] ?? "" : "",
  );
  check(
    "la URL incluye el endpoint configurado",
    url.includes("/PrzCV/"),
    url ? url.slice(0, 70) : "",
  );

  const img = url ? await fetch(url) : null;
  check(
    "la imagen existe en el CDN",
    img !== null && img.ok && (img.headers.get("content-type") ?? "").startsWith("image/"),
    img ? `HTTP ${img.status} · ${img.headers.get("content-type")}` : "",
  );

  // ── Guardado en la galería ──────────────────────────────────────────────
  await page.locator('input[name="alt"]').fill("Prueba automática ImageKit");
  // El formulario de la galería, no el de los tours, para no pulsar otro.
  await page
    .locator("form")
    .filter({ has: page.locator("#gallery-url") })
    .getByRole("button", { name: /^(agregar|add)$/i })
    .click();
  await page.waitForSelector("text=/Agregada|Added/", { timeout: 45000 });
  check("el panel acepta guardarla", true);

  // ── La foto se sirve transformada, no por el optimizador de Next ────────
  // ImageKit rechaza las peticiones del Worker, así que la URL debe llegar al
  // navegador tal cual, con la transformación `tr:` de ImageKit puesta.
  await page.waitForTimeout(1200);
  const render = await page.evaluate(() => {
    const img = [...document.querySelectorAll("img")].find((el) =>
      (el.currentSrc || el.src).includes("imagekit.io"),
    );
    return img ? (img.currentSrc || img.src) : "";
  });
  check(
    "la galería pinta la foto con la transformación de ImageKit",
    render.includes("/tr:") && render.includes("f-auto"),
    render.slice(render.indexOf("/tr:"), render.indexOf("/tr:") + 34) || "no encontrada",
  );
  check(
    "no pasa por el optimizador de Next",
    !render.includes("/_next/image"),
    render.includes("/_next/image") ? "usa /_next/image" : "",
  );

  check("sin errores JS", pageErrors.length === 0, pageErrors.join(" | "));
} catch (err) {
  check("sin errores inesperados", false, String(err).split("\n")[0].slice(0, 180));
}

const fallos = results.filter((r) => !r).length;
console.log(`\n${results.length - fallos}/${results.length} checks OK`);

// ── Limpieza ────────────────────────────────────────────────────────────
// Borrar la foto del panel (imagen de 3x3 que solo ocupa hueco) y el fichero
// de ImageKit, para no dejar basura en la base de datos ni en la cuenta.
async function limpiar() {
  if (!uploadedUrl) return;

  // 1) Fila de la galería: se borra desde el propio panel. Buscamos la tarjeta
  //    por la URL de la foto (el nombre sale en el `src` de la imagen, también
  //    con la transformación de ImageKit), no por texto: el nombre alternativo
  //    es un atributo `alt`, no contenido visible.
  try {
    await page.goto(`${origin}/es/admin/gallery`, { waitUntil: "networkidle", timeout: 60000 });
    const nombre = decodeURIComponent(uploadedUrl.split("/").pop() ?? "");
    const porFoto = () =>
      page.locator("figure").filter({ has: page.locator(`img[src*="${nombre}"]`) });

    if (await porFoto().count()) {
      // El botón de borrar pide confirmación con `window.confirm` y se llama
      // «✕», así que hay que aceptar el diálogo antes de pulsarlo.
      page.once("dialog", (d) => d.accept());
      await porFoto().first().getByRole("button", { name: /✕/ }).click();
      await page.waitForTimeout(3000);
      console.log(
        (await porFoto().count()) === 0
          ? "· foto borrada del panel."
          : "· la foto sigue en la galería.",
      );
    } else {
      console.log("· no se encontró la tarjeta de la foto en el panel.");
    }
  } catch (err) {
    console.log(`· no se pudo borrar la foto del panel: ${String(err).slice(0, 80)}`);
  }

  // 2) Fichero de ImageKit. El listado de ficheros no está disponible con la
  //    clave privada (devuelve 0 aunque existan), pero el borrado por id sí, y
  //    el id lo devolvió la API al subir.
  if (!uploadedFileId) {
    console.log("· la API no devolvió fileId; el fichero se queda en ImageKit.");
    return;
  }
  try {
    const clave = readFileSync(".dev.vars", "utf8")
      .split("\n")
      .find((l) => l.startsWith("IMAGEKIT_PRIVATE_KEY="))
      ?.slice("IMAGEKIT_PRIVATE_KEY=".length)
      .trim();
    if (!clave) throw new Error("sin clave en .dev.vars");

    const auth = `Basic ${Buffer.from(`${clave}:`).toString("base64")}`;
    const del = await fetch(`https://api.imagekit.io/v1/files/${uploadedFileId}`, {
      method: "DELETE",
      headers: { Authorization: auth },
    });
    console.log(`· fichero borrado de ImageKit (HTTP ${del.status}).`);
  } catch (err) {
    console.log(`· no se pudo borrar de ImageKit: ${String(err).slice(0, 80)}`);
  }
}

await limpiar();
// El navegador se cierra al final: la limpieza necesita la página para borrar
// la foto desde el propio panel.
await browser.close();
process.exit(fallos > 0 ? 1 : 0);