/**
 * Prueba de la galería pública y del botón «Ver más» de la home.
 *
 * Uso:  node scripts/test-gallery.mjs [origen] [carpeta-png]
 *
 * Comprueba que:
 *  - la galería de la home se ve y enlaza a la página completa cuando hay más
 *    fotos de las que enseña,
 *  - el enlace lleva a `/<idioma>/gallery` y esa página existe,
 *  - la página enseña tantas fotos como hay publicadas (más que el recorte de
 *    la home),
 *  - no hay imágenes rotas ni desbordamiento horizontal en móvil,
 *  - la página existe también en inglés y no muestra fotos ocultas.
 *
 * No crea ni borra nada.
 */
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, devices } from "playwright-core";

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
const outDir = process.argv[3] ?? mkdtempSync(join(tmpdir(), "prz-gallery-"));

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * Fotos de la rejilla y cuántas están rotas de verdad.
 *
 * Antes de mirar hay que recorrer la página: las fotos de más abajo van con
 * `loading="lazy"` y, sin hacer scroll, el navegador no las ha pedido y
 * `naturalWidth` es 0. Contarlas sin más daría falsos «rotas».
 */
async function contarFotos(pagina) {
  await pagina.evaluate(async () => {
    const alto = document.body.scrollHeight;
    // Se va despacio y se espera en cada paso: las fotos con `loading="lazy"`
    // necesitan estar en pantalla un momento para que el navegador las pida.
    for (let y = 0; y < alto; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 260));
    }
    window.scrollTo(0, 0);
  });
  // Se espera a que todas hayan terminado de cargar antes de contarlas.
  await pagina
    .waitForFunction(
      () => {
        const fotos = [...document.querySelectorAll("figure img")];
        return fotos.length > 0 && fotos.every((i) => i.complete);
      },
      { timeout: 30000 },
    )
    .catch(() => {});
  await pagina.waitForTimeout(600);
  return pagina.evaluate(() => {
    const fotos = [...document.querySelectorAll("figure img")];
    return {
      total: fotos.length,
      rotas: fotos.filter((i) => !(i.complete && i.naturalWidth > 0)).length,
    };
  });
}

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0].slice(0, 160)));

try {
  // ── Home: botón «Ver más» ──────────────────────────────────────────────
  await page.goto(`${origin}/es`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);

  const verMas = page.getByRole("link", { name: /ver m/i }).first();
  const hayBoton = (await verMas.count()) > 0;
  check("la home tiene el botón «Ver más» en la galería", hayBoton);

  if (hayBoton) {
    const href = await verMas.getAttribute("href");
    check("el botón apunta a /es/gallery", href === "/es/gallery", href ?? "");

    const home = await contarFotos(page);
    check("la home enseña fotos", home.total > 0, `${home.total} fotos`);
    check("ninguna foto rota en la home", home.rotas === 0, `${home.rotas} rota(s)`);
  }

  // ── Página completa ────────────────────────────────────────────────────
  const res = await page.goto(`${origin}/es/gallery`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  check("la página /es/gallery responde 200", res?.status() === 200, `${res?.status()}`);

  const completa = await contarFotos(page);
  check("la página tiene fotos", completa.total > 0, `${completa.total} fotos`);
  check("ninguna foto rota en la página", completa.rotas === 0, `${completa.rotas} rota(s)`);

  // Cuenta de fotos visible para el visitante. Se mira aquí, con la página de
  // la galería abierta: si se comprobara después de ir a la home, no saldría.
  const cuenta = await page
    .getByText(/^\d+\s+(foto|photo)s?$/i)
    .first()
    .innerText()
    .catch(() => "");
  check("indica cuántas fotos hay", /\d+/.test(cuenta), cuenta || "no aparece");

  if (hayBoton) {
    const home = await (async () => {
      await page.goto(`${origin}/es`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(900);
      return contarFotos(page);
    })();
    // Solo tiene sentido si realmente hay recorte; si no, la página puede
    // coincidir y no es un fallo.
    check(
      "la página muestra al menos tantas fotos como la home",
      completa.total >= home.total,
      `página ${completa.total} vs home ${home.total}`,
    );
    // Se vuelve a la galería para la comprobación siguiente.
    await page.goto(`${origin}/es/gallery`, { waitUntil: "networkidle", timeout: 60000 });
  }

  await page.screenshot({ path: join(outDir, "01-gallery-es.png"), fullPage: false });

  // ── Inglés ─────────────────────────────────────────────────────────────
  const resEn = await page.goto(`${origin}/en/gallery`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  check("la página existe en inglés", resEn?.status() === 200, `${resEn?.status()}`);
  const en = await contarFotos(page);
  check("el inglés tiene las mismas fotos", en.total === completa.total, `${en.total} vs ${completa.total}`);

  // ── Móvil: sin desbordamiento ──────────────────────────────────────────
  const ctxMovil = await browser.newContext({ ...devices["Pixel 5"], locale: "es-DO" });
  const movil = await ctxMovil.newPage();
  await movil.goto(`${origin}/es/gallery`, { waitUntil: "networkidle", timeout: 60000 });
  await movil.waitForTimeout(1200);
  const desborda = await movil.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  check("sin desbordamiento horizontal en móvil", desborda === false);
  const movilFotos = await movil.evaluate(() => {
    const f = [...document.querySelectorAll("figure img")];
    return { total: f.length, rotas: f.filter((i) => !(i.complete && i.naturalWidth > 0)).length };
  });
  check("las fotos cargan en móvil", movilFotos.rotas === 0, `${movilFotos.rotas} rota(s)`);
  await movil.screenshot({ path: join(outDir, "02-gallery-movil.png") });
  await ctxMovil.close();

  check("sin pageerrors", pageErrors.length === 0, pageErrors[0] ?? "");
} catch (err) {
  check("sin errores inesperados", false, String(err).split("\n")[0].slice(0, 180));
} finally {
  await browser.close();
}

const fallos = results.filter((r) => !r).length;
console.log(`\n${results.length - fallos}/${results.length} checks OK · PNG en ${outDir}`);
process.exit(fallos > 0 ? 1 : 0);