/**
 * Test móvil con emulación real (viewport 390x844, táctil, UA móvil).
 *
 * Uso:
 *   npm run test:mobile -- [url] [salida]
 *   npm run test:desktop -- [url] [salida]
 *   node scripts/mobile-test.mjs http://localhost:3000/es
 *   node scripts/mobile-test.mjs --desktop http://localhost:3000/en ./shots-desktop
 *
 * Qué hace:
 *  1. Abre la home emulando un móvil (390x844 táctil) o desktop (1440x900).
 *  2. Captura: arriba del todo, con scroll (animación del logo) y con el
 *     menú hamburguesa abierto (tap real).
 *  3. Lee del DOM: opacidad del mini-logo del header, opacidad/transform
 *     del logo del hero, estado del menú, errores de consola y de página.
 *  4. Imprime un resumen PASS/FAIL y guarda los PNG en la carpeta de salida.
 *
 * Requiere el dev corriendo (`npm run dev`). No descarga navegadores: usa
 * el Edge instalado en el sistema.
 */
import { chromium } from "playwright-core";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
];

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const rawArgs = process.argv.slice(2);
const desktop = rawArgs.includes("--desktop");
const args = rawArgs.filter((a) => a !== "--desktop");
const url = args[0] ?? "http://localhost:3000/es";
const outDir = args[1] ?? mkdtempSync(join(tmpdir(), "prz-web-"));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const executablePath = EDGE_PATHS.find((p) => existsSync(p));
if (!executablePath) {
  console.error("FAIL  no se encontró Edge en:", EDGE_PATHS.join(" | "));
  process.exit(2);
}

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

const context = await browser.newContext(
  desktop
    ? {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        userAgent: DESKTOP_UA,
      }
    : {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: MOBILE_UA,
      },
);
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
});
page.on("pageerror", (err) =>
  pageErrors.push(String(err).split("\n")[0].slice(0, 300)),
);

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1200);

// 1) Arriba del todo: hero visible, header sin logo.
await page.screenshot({ path: join(outDir, "01-top.png") });
const top = await page.evaluate(() => {
  const mini = document.querySelector('header a[aria-label*="Perez"]');
  const hero = document.getElementById("hero-logo");
  return {
    miniOpacity: mini ? getComputedStyle(mini).opacity : "n/a",
    heroOpacity: hero ? getComputedStyle(hero).opacity : "n/a",
    heroVisible:
      hero != null && hero.getBoundingClientRect().bottom > 0,
    scrollY: window.scrollY,
  };
});
check("arriba: mini-logo oculto", Number(top.miniOpacity) < 0.1, `opacity=${top.miniOpacity}`);
check("arriba: hero visible", top.heroVisible === true, `opacity=${top.heroOpacity}`);

// 2) Scroll a media página: el mini-logo debe aparecer.
await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
await page.waitForTimeout(800);
await page.screenshot({ path: join(outDir, "02-scrolled.png") });
const mid = await page.evaluate(() => {
  const mini = document.querySelector('header a[aria-label*="Perez"]');
  const hero = document.getElementById("hero-logo");
  return {
    miniOpacity: mini ? getComputedStyle(mini).opacity : "n/a",
    heroOpacity: hero ? getComputedStyle(hero).opacity : "n/a",
    heroTransform: hero ? hero.style.transform : "n/a",
    scrollY: window.scrollY,
  };
});
check("scroll: mini-logo visible", Number(mid.miniOpacity) > 0.9, `opacity=${mid.miniOpacity}`);
check(
  "scroll: hero atenuado/movido",
  Number(mid.heroOpacity) < 1 || mid.heroTransform !== "",
  `opacity=${mid.heroOpacity} transform=${mid.heroTransform}`,
);

// 3) Volver arriba: todo revierte (animación viva en ambos sentidos).
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(800);
const back = await page.evaluate(() => {
  const mini = document.querySelector('header a[aria-label*="Perez"]');
  const hero = document.getElementById("hero-logo");
  return {
    miniOpacity: mini ? getComputedStyle(mini).opacity : "n/a",
    heroOpacity: hero ? getComputedStyle(hero).opacity : "n/a",
  };
});
check("volver: mini-logo se oculta", Number(back.miniOpacity) < 0.1, `opacity=${back.miniOpacity}`);
check("volver: hero se restaura", Number(back.heroOpacity) > 0.9, `opacity=${back.heroOpacity}`);

// 4) Navegación: en móvil abre la hamburguesa con tap real; en desktop
// la nav va visible y la hamburguesa oculta.
if (desktop) {
  await page.screenshot({ path: join(outDir, "03-nav.png") });
  const nav = await page.evaluate(() => {
    const btn = document.querySelector("header button");
    const nav = document.querySelector("header nav");
    const links = nav
      ? [...nav.querySelectorAll("a")].map((a) => a.textContent.trim()).filter(Boolean)
      : [];
    return {
      burgerHidden: btn == null || getComputedStyle(btn).display === "none" || btn.getBoundingClientRect().width === 0,
      navVisible: nav != null && nav.getBoundingClientRect().width > 0,
      links: links.slice(0, 10),
    };
  });
  check("desktop: hamburguesa oculta", nav.burgerHidden === true);
  check("desktop: nav visible", nav.navVisible === true, `links=[${nav.links.join("|")}]`);
} else {
  const menuBtn = page.locator("header button").first();
  await menuBtn.tap();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, "03-menu.png") });
  const menu = await page.evaluate(() => {
    const nav = document.querySelector("header nav");
    const links = nav
      ? [...nav.querySelectorAll("a")].map((a) => a.textContent.trim()).filter(Boolean)
      : [];
    return {
      // El desplegable móvil usa .container-site dentro del header.
      open: [...document.querySelectorAll("header a")].some((a) =>
        /tours|traslados|contacto/i.test(a.textContent),
      ),
      links: links.slice(0, 8),
    };
  });
  check("menú: abre con tap", menu.open === true, `links=[${menu.links.join("|")}]`);
}

// 5) Sin errores JS.
check("sin pageerrors", pageErrors.length === 0, pageErrors[0] ?? "");
check("sin console.error", consoleErrors.length === 0, consoleErrors[0] ?? "");

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK · PNG en ${outDir}`);
writeFileSync(join(outDir, "report.json"), JSON.stringify({ url, results, consoleErrors, pageErrors }, null, 2));
if (failed.length > 0) process.exitCode = 1;
