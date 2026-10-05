/**
 * Captura la home con perfil de Android y detecta desbordamiento horizontal.
 *
 * Uso:  node scripts/probe-android.mjs [url] [salida]
 *
 * Usa un Android real (Pixel 5: 393x851, DPR 2.75, Chrome 125) en vez del
 * móvil genérico de mobile-test.mjs, porque el layout se comporta distinto:
 * barra de direcciones, altura útil menor y fuentes del sistema Android.
 *
 * Guarda PNG (arriba y con el menú abierto) e imprime los elementos que
 * sobresalen del ancho de la pantalla.
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

const url = (process.argv[2] ?? "http://localhost:3000/es").replace(/\/$/, "");
const outDir = process.argv[3] ?? mkdtempSync(join(tmpdir(), "prz-android-"));

// Pixel 5 real.
const pixel5 = devices["Pixel 5"];
console.log(`Android · ${pixel5.viewport.width}x${pixel5.viewport.height} @${pixel5.deviceScaleFactor}x\n`);

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const context = await browser.newContext({
  ...pixel5,
  locale: "es-DO",
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1200);

/** Elementos que se salen del ancho visible. */
async function overflowing() {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > limit + 1 || r.left < -1) {
        const style = getComputedStyle(el);
        if (style.position === "fixed" && style.visibility === "hidden") continue;
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString?.() ?? "").slice(0, 70),
          left: Math.round(r.left),
          right: Math.round(r.right),
          limit,
        });
      }
    }
    return out.slice(0, 12);
  });
}

const doc = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  bodyW: document.body.scrollWidth,
}));

console.log(`ancho documento: ${doc.scrollW}px · visible: ${doc.clientW}px · body: ${doc.bodyW}px`);
const hayOverflow = doc.scrollW > doc.clientW + 1;
console.log(hayOverflow ? "✗ DESBORDA horizontalmente" : "✓ sin desbordamiento horizontal");

const over = await overflowing();
if (over.length > 0) {
  console.log(`\n${over.length} elemento(s) fuera de pantalla:`);
  for (const o of over) {
    console.log(`  <${o.tag}> left=${o.left} right=${o.right} (límite ${o.limit})`);
    console.log(`      ${o.cls}`);
  }
}

await page.screenshot({ path: join(outDir, "01-arriba.png") });

// Con el menú abierto, que es donde más se desborda.
const burger = page
  .locator('button[aria-label*="menú" i], button[aria-label*="menu" i]')
  .first();
if (await burger.count()) {
  await burger.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(outDir, "02-menu.png") });
  const overMenu = await overflowing();
  if (overMenu.length > 0) {
    console.log(`\ncon el menú abierto, ${overMenu.length} elemento(s) fuera:`);
    for (const o of overMenu.slice(0, 8)) {
      console.log(`  <${o.tag}> left=${o.left} right=${o.right} · ${o.cls}`);
    }
  }
}

// Scrolled: el hero y el mini-logo.
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.mouse.wheel(0, 700);
await page.waitForTimeout(900);
await page.screenshot({ path: join(outDir, "03-scrolled.png") });

if (errors.length > 0) console.log(`\nerrores JS: ${errors.join(" | ")}`);

await browser.close();
console.log(`\nPNG en ${outDir}`);
process.exit(hayOverflow || over.length > 0 ? 1 : 0);