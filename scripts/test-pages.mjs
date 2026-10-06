/**
 * Barrido completo de páginas (`npm run test:pages`).
 *
 * Uso:
 *   node scripts/test-pages.mjs [origen] [salida] [--desktop|--mobile|both]
 *
 * Recorre TODAS las páginas públicas (es+en) y del panel (como admin):
 * estado 200, marcador de contenido, cero pageerrors. Además prueba el
 * formulario de contacto de punta a punta (crea UN mensaje real en local).
 *
 * Requiere el dev corriendo y un admin local (dev@suprime.xyz).
 */
import { chromium } from "playwright-core";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { crearLimpiador } from "./cleanup.mjs";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
];
const executablePath = EDGE_PATHS.find((p) => existsSync(p));
if (!executablePath) {
  console.error("FAIL  no se encontró Edge");
  process.exit(2);
}

const rawArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const only = process.argv.includes("--desktop")
  ? "desktop"
  : process.argv.includes("--mobile")
    ? "mobile"
    : "both";
const origin = (rawArgs[0] ?? "http://localhost:3000").replace(/\/$/, "");
const limpiar = crearLimpiador(origin);
const outDir = rawArgs[1] ?? mkdtempSync(join(tmpdir(), "prz-pages-"));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const MODES = {
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  },
  desktop: { viewport: { width: 1440, height: 900 } },
};

const PUBLIC_PAGES = [
  ["/es", "Aventuras inolvidables"],
  ["/en", "Unforgettable adventures"],
  ["/es/tours", "Nuestros tours"],
  ["/en/tours", "Our tours"],
  ["/es/transfers", "Traslados de aeropuerto"],
  ["/en/transfers", "Airport transfers"],
  ["/es/book", "Reservar ahora"],
  ["/es/book?type=transfer", "Reservar ahora"],
  ["/es/book?type=custom", "Arma tu tour"],
  ["/es/about", "Sobre Perez Tours"],
  ["/es/contact", "Contáctanos"],
  ["/es/track", "Consulta tu reserva"],
  ["/es/blog", "Blog"],
  ["/es/login", "Acceso"],
  ["/es/signup", "Crea tu cuenta"],
];

const ADMIN_PAGES = [
  "/es/admin",
  "/es/admin/bookings",
  "/es/admin/occupancy",
  "/es/admin/tours",
  "/es/admin/transfers",
  "/es/admin/testimonials",
  "/es/admin/promos",
  "/es/admin/coupons",
  "/es/admin/blog",
  "/es/admin/faq",
  "/es/admin/gallery",
  "/es/admin/messages",
  "/es/admin/users",
  "/es/admin/settings",
  "/es/admin/activity",
];

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

for (const mode of only === "both" ? ["mobile", "desktop"] : [only]) {
  const ctx = await browser.newContext(MODES[mode]);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(`${page.url()} :: ${String(err).split("\n")[0].slice(0, 150)}`));

  // Páginas públicas.
  for (const [path, marker] of PUBLIC_PAGES) {
    const res = await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    const body = (await page.textContent("body")) ?? "";
    check(
      `[${mode}] ${path} 200 + contenido`,
      res?.status() === 200 && body.includes(marker),
      `status=${res?.status()}`,
    );
  }

  // Detalle del primer tour + primer artículo.
  await page.goto(`${origin}/es/tours`, { waitUntil: "networkidle", timeout: 60000 });
  const tourHref = await page.locator('a[href*="/es/tours/"]').first().getAttribute("href").catch(() => null);
  if (tourHref) {
    const res = await page.goto(`${origin}${tourHref}`, { waitUntil: "networkidle", timeout: 60000 });
    const body = (await page.textContent("body")) ?? "";
    check(`[${mode}] detalle tour + reserva`, res?.status() === 200 && /reservar este tour/i.test(body), tourHref);
  } else {
    check(`[${mode}] detalle tour + reserva`, false, "sin tours publicados");
  }
  await page.goto(`${origin}/es/blog`, { waitUntil: "networkidle", timeout: 60000 });
  const postHref = await page.locator('a[href*="/es/blog/"]').first().getAttribute("href").catch(() => null);
  if (postHref) {
    const res = await page.goto(`${origin}${postHref}`, { waitUntil: "networkidle", timeout: 60000 });
    check(`[${mode}] artículo blog`, res?.status() === 200, postHref);
  }

  // Catálogo: filtro por categoría actualiza resultados.
  await page.goto(`${origin}/es/tours`, { waitUntil: "networkidle", timeout: 60000 });
  const filterBtn = page.getByRole("button", { name: /agua|aventura|cultura/i }).first();
  if ((await filterBtn.count()) > 0) {
    await filterBtn.click();
    await page.waitForTimeout(800);
    const txt = (await page.textContent("body")) ?? "";
    check(`[${mode}] filtro catálogo`, /tour encontrado|tours encontrados/i.test(txt));
  }

  // Contacto de punta a punta (crea UN mensaje real en local).
  await page.goto(`${origin}/es/contact`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#name").fill("Test Páginas");
  await page.locator("#email").fill("test-pages@example.com");
  await page.locator("#message").fill("Mensaje de prueba del barrido completo de páginas, por favor ignorar.");
  await page.getByRole("button", { name: /enviar mensaje/i }).click();
  await page.waitForTimeout(3000);
  const contactOk = /mensaje enviado/i.test((await page.textContent("body")) ?? "");
  check(`[${mode}] contacto envía`, contactOk);

  // Panel como admin.
  await page.goto(`${origin}/es/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#email").fill("dev@suprime.xyz");
  await page.locator("#password").fill("Ultra1255");
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForFunction(
    () => /^\/(es|en)\/admin/.test(new URL(window.location.href).pathname),
    { timeout: 60000 },
  ).catch(() => {});
  check(`[${mode}] login admin`, /^\/(es|en)\/admin/.test(new URL(page.url()).pathname), page.url());
  for (const path of ADMIN_PAGES) {
    const res = await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    const body = (await page.textContent("body")) ?? "";
    const stayed = new URL(page.url()).pathname === path;
    check(`[${mode}] ${path}`, res?.status() === 200 && body.length > 1500 && stayed, `status=${res?.status()}`);
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    );
    check(`[${mode}] ${path} sin overflow`, noOverflow === true);
  }
  // Detalle de la primera reserva (si hay).
  await page.goto(`${origin}/es/admin/bookings`, { waitUntil: "networkidle", timeout: 60000 });
  const bookingHref = await page.locator('a[href*="/es/admin/bookings/"]').first().getAttribute("href").catch(() => null);
  if (bookingHref) {
    const res = await page.goto(`${origin}${bookingHref}`, { waitUntil: "networkidle", timeout: 60000 });
    check(`[${mode}] detalle reserva`, res?.status() === 200, bookingHref);
  }

  check(`[${mode}] sin pageerrors`, pageErrors.length === 0, pageErrors[0] ?? "");
  await page.screenshot({ path: join(outDir, `${mode}-home.png`) }).catch(() => {});
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK · ${outDir}`);

// El barrido manda un mensaje de contacto de verdad; se apunta para borrarlo
// al terminar, que si no el panel se llena de «Test Páginas».
limpiar.mensaje("test-pages@example.com");
limpiar.ejecutar();

writeFileSync(join(outDir, "report.json"), JSON.stringify({ origin, results }, null, 2));
if (failed.length > 0) {
  console.log("\nFALLOS:");
  for (const f of failed) console.log(` - ${f.name} ${f.detail}`);
  process.exitCode = 1;
}
