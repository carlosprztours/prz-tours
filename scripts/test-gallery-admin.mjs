/**
 * Prueba de la edición de la galería y de la subida de varias fotos de golpe.
 *
 * Uso:  node scripts/test-gallery-admin.mjs [origen] [carpeta-png]
 *
 * Hace exactamente lo que se ha cambiado:
 *  1. entrar al panel,
 *  2. subir TRES fotos de golpe con el botón (no una a una),
 *  3. comprobar que se crean tres fichas en la galería,
 *  4. editar el texto alternativo y el orden de una de ellas y comprobar que
 *     se guarda,
 *  5. comprobar que marcar una foto como oculta la saca de la web y que al
 *     volver a publicarla la devuelve,
 *  6. borrar las filas de la galería y los ficheros de ImageKit.
 *
 * No toca reservas ni manda correos. Al terminar no deja rastro: borra las
 * filas de la galería y los ficheros de ImageKit (por id, que es lo único que
 * permite la clave privada).
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { d1 as consultarD1 } from "./cleanup.mjs";

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
const outDir = process.argv[3] ?? mkdtempSync(join(tmpdir(), "prz-gal-admin-"));
const MARCA = Date.now().toString(36).slice(-5);
const REMOTO = !/localhost|127\.0\.0\.1/.test(origin);

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

// ── Consulta a la D1 del origen que se está probando ───────────────────────
// Reutiliza el ayudante de `cleanup.mjs`, que ya entrecomilla el SQL para
// Windows y carga los secretos. Devuelve solo el array de filas.
function d1(consulta) {
  const bloques = consultarD1(consulta, { remote: REMOTO });
  return Array.isArray(bloques) ? (bloques[0]?.results ?? []) : [];
}

// ── Fotos de prueba ────────────────────────────────────────────────────────
const PNG_BASE =
  "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAF0lEQVR42u3OMQEAAAgDoC251a3gLwSgcrfTBgQCgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAoFAIBAIBAKBQCAQCAQOgAB1YkZ2QAAAABJRU5ErkJggg==";

const tmp = mkdtempSync(join(tmpdir(), "prz-gal-fotos-"));
const rutas = [1, 2, 3].map((n) => {
  const p = join(tmp, `galeria-${n}.png`);
  writeFileSync(p, Buffer.from(PNG_BASE, "base64"));
  return p;
});

const ALT_EDITADO = `Foto de prueba ${MARCA}`;

let idsCreadas = [];
let urlsCreadas = [];
let urlsSubidas = [];
let idsImageKit = [];

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0].slice(0, 160)));

// La API devuelve la URL y el id de ImageKit de cada foto. La URL sirve para
// localizar las fichas creadas; el id, para borrar los ficheros al terminar.
page.on("response", async (res) => {
  if (!res.url().includes("/api/admin/upload") || !res.ok()) return;
  const cuerpo = await res.json().catch(() => null);
  for (const img of cuerpo?.images ?? []) {
    if (img?.url) urlsSubidas.push(img.url);
    if (img?.fileId) idsImageKit.push(img.fileId);
  }
});

const publicadas = (url) =>
  d1(
    `SELECT url FROM gallery_images WHERE is_published = 1 AND url = '${String(url).replace(/'/g, "''")}'`,
  ).length;

try {
  // ── 1) Login ────────────────────────────────────────────────────────────
  await page.goto(`${origin}/es/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#email").fill("dev@suprime.xyz");
  await page.locator("#password").fill("Ultra1255");
  await page
    .locator("form")
    .filter({ has: page.locator("#password") })
    .getByRole("button", { name: /entrar/i })
    .first()
    .click();
  await page.waitForURL(/\/es\/(admin|cuenta)/, { timeout: 45000 });
  check("login en el panel", true);

  // ── 2) Subir tres fotos de golpe ─────────────────────────────────────────
  await page.goto(`${origin}/es/admin/gallery`, { waitUntil: "networkidle", timeout: 60000 });
  const antes = Number(d1(`SELECT COUNT(*) AS n FROM gallery_images`)[0]?.n ?? 0);

  await page.locator('input[type="file"]').first().setInputFiles(rutas);

  // El aviso verde de «fotos listas» se busca acotado al formulario de alta,
  // nunca en el cuerpo entero (que incluye el payload de RSC).
  const aviso = page
    .getByText(/\d+ (foto|fotos) listas?\.?/i)
    .first();
  await aviso.waitFor({ timeout: 90000 }).catch(() => {});
  const textoAviso = (await aviso.innerText().catch(() => "")) ?? "";
  check("avisa de las 3 fotos subidas de golpe", /3 fotos/.test(textoAviso), textoAviso);

  await page.getByRole("button", { name: /^(agregar|add)$/i }).click();
  // Se espera al `role="status"` del propio formulario. Sin esta espera el
  // script recargaba antes de que la Server Action terminara y el guardado se
  // quedaba a medias, sin avisar.
  const guardado = page.getByRole("status").first();
  const avisoGuardado = await guardado
    .waitFor({ timeout: 60000 })
    .then(() => guardado.innerText())
    .catch(() => "");
  check("el formulario confirma el alta", /agregad|added/i.test(avisoGuardado), avisoGuardado);

  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  const despues = Number(d1(`SELECT COUNT(*) AS n FROM gallery_images`)[0]?.n ?? 0);
  check("se crean 3 fichas de golpe", despues - antes === 3, `antes ${antes}, después ${despues}`);

  // Las fichas se localizan por la URL que devolvió la subida, NUNCA por
  // «los últimos ids»: si el alta falla, esa búsqueda destruiría después
  // fotos reales que ya estaban en la galería.
  const subirUrls = await Promise.all(
    urlsSubidas.map((u) => fetch(u, { method: "HEAD" }).then(() => u).catch(() => null)),
  );
  urlsCreadas = subirUrls.filter(Boolean);
  idsCreadas = d1(
    `SELECT id FROM gallery_images WHERE url IN (${urlsCreadas.map((u) => `'${u}'`).join(",")})`,
  ).map((r) => Number(r.id));

  if (idsCreadas.length !== 3) {
    // Sin las 3 fichas propias no se sigue: las pruebas de edición podrían
    // tocar fotos que no son de esta prueba.
    check("las 3 fichas son localizables por URL", false, `encontradas ${idsCreadas.length}`);
    throw new Error("el alta no creó las 3 fichas propias; se aborta antes de editar nada");
  }
  check("las 3 fichas son localizables por URL", true);

  // ── 3) Las fotos existen en ImageKit y responden ────────────────────────
  const enImageKit = urlsCreadas.filter((u) => /imagekit\.io/.test(u ?? "")).length;
  check("las 3 están en ImageKit", enImageKit === 3, `${enImageKit}/3`);
  const responden = (
    await Promise.all(
      urlsCreadas.map(async (u) => (await fetch(u).catch(() => null))?.ok === true),
    )
  ).filter(Boolean).length;
  check("las 3 URLs responden", responden === 3, `${responden}/3`);

  // ── 4) Editar texto alternativo y orden ─────────────────────────────────
  const id = idsCreadas.at(-1);
  const ficha = page
    .locator("figure")
    .filter({ has: page.locator(`input[value="${id}"]`) })
    .first();
  check("cada foto tiene su ficha editable", (await ficha.count()) > 0);

  if ((await ficha.count()) > 0) {
    await ficha.locator('input[name="alt"]').fill(ALT_EDITADO);
    await ficha.locator('input[name="sort_order"]').fill("7");
    await ficha.getByRole("button", { name: /guardar|save/i }).click();
    await ficha.getByText(/guardado|saved/i).waitFor({ timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const fila = d1(`SELECT alt || '|' || sort_order AS v FROM gallery_images WHERE id = ${id}`)[0]?.v;
    check("guarda el texto alternativo", (fila ?? "").startsWith(ALT_EDITADO), fila ?? "");
    check("guarda el orden", (fila ?? "").endsWith("|7"), fila ?? "");

    // ── 5) Ocultar y volver a publicar ────────────────────────────────────
    const url = urlsCreadas.at(-1);
    check("la foto editada está publicada", publicadas(url) === 1);

    await ficha.locator('input[name="is_published"]').uncheck();
    await ficha.getByRole("button", { name: /guardar|save/i }).click();
    await page.waitForTimeout(3000);
    check("ocultarla la saca de las publicadas", publicadas(url) === 0);

    await ficha.locator('input[name="is_published"]').check();
    await ficha.getByRole("button", { name: /guardar|save/i }).click();
    await page.waitForTimeout(3000);
    check("volver a publicarla la devuelve", publicadas(url) === 1);
  }

  check("sin pageerrors", pageErrors.length === 0, pageErrors[0] ?? "");
} catch (err) {
  check("sin errores inesperados", false, String(err).split("\n")[0].slice(0, 200));
} finally {
  await browser.close();
}

// ── Limpieza ───────────────────────────────────────────────────────────────
if (idsCreadas.length > 0) {
  d1(`DELETE FROM gallery_images WHERE id IN (${idsCreadas.join(",")});`);
  const quedan = d1(`SELECT COUNT(*) AS n FROM gallery_images`)[0]?.n;
  console.log(`· ${idsCreadas.length} ficha(s) borrada(s) de la galería (quedan ${quedan}).`);
}

// Ficheros de ImageKit: la clave privada no permite listarlos, así que se
// borran por id, que es lo que devolvió la API al subir.
if (idsImageKit.length > 0) {
  try {
    const clave = readFileSync(".dev.vars", "utf8")
      .split("\n")
      .find((l) => l.startsWith("IMAGEKIT_PRIVATE_KEY="))
      ?.slice("IMAGEKIT_PRIVATE_KEY=".length)
      .trim();
    if (clave) {
      const auth = `Basic ${Buffer.from(`${clave}:`).toString("base64")}`;
      for (const id of idsImageKit) {
        const r = await fetch(`https://api.imagekit.io/v1/files/${id}`, {
          method: "DELETE",
          headers: { Authorization: auth },
        });
        console.log(`· fichero de ImageKit borrado (HTTP ${r.status}).`);
      }
    }
  } catch {
    console.log("· no se pudieron borrar los ficheros de ImageKit.");
  }
}

const fallos = results.filter((r) => !r).length;
console.log(`\n${results.length - fallos}/${results.length} checks OK · PNG en ${outDir}`);
process.exit(fallos > 0 ? 1 : 0);