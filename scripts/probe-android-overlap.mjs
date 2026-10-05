/**
 * Comprueba que el botón flotante de WhatsApp NO tape nada pulsable.
 *
 * Uso:  node scripts/probe-android-overlap.mjs [url]
 *
 * En Android el alto útil es bastante menor que en el móvil genérico
 * (barra de direcciones + barra de navegación), así que el hero se desborda.
 *
 * Solo se consideran los solapes con enlaces y botones (CTA, menús): un texto
 * estático puede quedar momentáneamente bajo el botón de WhatsApp al hacer
 * scroll y es el comportamiento normal de un chat flotante. Lo que sí es un
 * fallo es tapar algo que el usuario no puede pulsar.
 */
import { existsSync } from "node:fs";

import { chromium, devices } from "playwright-core";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
];
const executablePath = EDGE_PATHS.find((p) => existsSync(p));
const url = (process.argv[2] ?? "https://perez-tours.com/es").replace(/\/$/, "");

const PERFILES = [
  { nombre: "Android Pixel 5", device: devices["Pixel 5"] },
  { nombre: "Android Galaxy S9", device: devices["Galaxy S9+"] },
  { nombre: "iPhone 13", device: devices["iPhone 13"] },
  { nombre: "móvil genérico", device: devices["iPhone 13"] },
];

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
let fallos = 0;

for (const perfil of PERFILES) {
  const d = perfil.device;
  const context = await browser.newContext({ ...d, locale: "es-DO" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const doc = document.documentElement;
    // Cajas de los flotantes: botones fijos de las esquinas.
    const fijos = [...document.querySelectorAll("*")]
      .filter((el) => {
        const s = getComputedStyle(el);
        return (
          (s.position === "fixed" || s.position === "sticky") &&
          el.getBoundingClientRect().width > 40 &&
          el.getBoundingClientRect().height > 40
        );
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el,
          tag: el.tagName.toLowerCase(),
          label: (el.getAttribute("aria-label") ?? el.className?.toString?.() ?? "").slice(0, 45),
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
        };
      });

    // Enlaces y botones visibles: lo único que el usuario no puede pulsar si
    // queda debajo del flotante. Se descartan los que están dentro de un
    // flotante (p. ej. el <header> contiene al botón EN: es ancestro, no
    // superposición) y los que están dentro de otro elemento pulsable.
    const enFlotante = (el) => fijos.some((f) => f.el?.contains?.(el));
    const dentroDePulsable = (el) => el.closest("a, button, [role='button']") !== el;
    const pulsables = [...document.querySelectorAll("a, button, [role='button']")]
      .filter((el) => {
        if (enFlotante(el) || dentroDePulsable(el)) return false;
        const r = el.getBoundingClientRect();
        return (
          r.width > 24 &&
          r.height > 24 &&
          r.top < window.innerHeight &&
          r.bottom > 0 &&
          getComputedStyle(el).visibility !== "hidden"
        );
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          txt: (el.textContent ?? "").trim().slice(0, 38),
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
        };
      });

    const solapa = (a, b) =>
      a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;

    const choques = [];
    for (const f of fijos) {
      for (const t of pulsables) {
        if (solapa(f, t)) {
          choques.push(`<${f.tag}> "${f.label}" pisa <${t.tag}> "${t.txt}"`);
        }
      }
    }

    // ¿El botón principal del hero se ve sin hacer scroll?
    const cta = [...document.querySelectorAll("a, button")].find((el) =>
      /explorar tours/i.test(el.textContent ?? ""),
    );
    const ctaRect = cta?.getBoundingClientRect();
    const ctaVisible = ctaRect ? ctaRect.top < window.innerHeight && ctaRect.bottom > 0 : null;

    return {
      altoUtil: window.innerHeight,
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      choques,
      ctaVisible,
      ctaTop: ctaRect ? Math.round(ctaRect.top) : null,
    };
  });

  const overflow = info.scrollW > info.clientW + 1;
  const mal = info.choques.length > 0 || overflow;
  if (mal) fallos += 1;

  console.log(`${perfil.nombre}  ${d.viewport.width}x${info.altoUtil}`);
  console.log(`  ${overflow ? "✗" : "✓"} desborde horizontal (${info.scrollW} vs ${info.clientW})`);
  console.log(
    `  ${info.ctaVisible ? "✓" : "✗"} CTA «Explorar tours» ${info.ctaVisible ? "visible" : "fuera de pantalla"} (top=${info.ctaTop})`,
  );
  if (info.choques.length > 0) {
    console.log(`  ✗ ${info.choques.length} solape(s):`);
    for (const c of info.choques.slice(0, 5)) console.log(`      ${c}`);
  }
  console.log("");

  await context.close();
}

await browser.close();
console.log(fallos > 0 ? `✗ ${fallos} perfil(es) con problemas` : "✓ todos los perfiles limpios");
process.exit(fallos > 0 ? 1 : 0);