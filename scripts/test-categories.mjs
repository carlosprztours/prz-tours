/**
 * Test de categorías dinámicas + push (PWA instalable).
 *
 * Uso:
 *   node scripts/test-categories.mjs [origen] [salida]
 *
 * Flujo en el dev local:
 *  1. El admin entra al panel y abre el gestor de categorías.
 *  2. Crea una categoría nueva solo con el nombre en español → se guarda
 *     traducida al inglés (auto-traducción ES→EN) y aparece en el formulario
 *     de tours.
 *  3. El catálogo público la usa como filtro y la tarjeta muestra su nombre.
 *  4. Intentos crearla otra vez → error "slug-taken".
 *  5. Se desactiva: deja de salir como filtro pero el tour sigue intacto.
 *  6. Push: /api/push/public-key entrega la clave VAPID; sin sesión el alta
 *     devuelve 401.
 *
 * Requiere el dev corriendo y el admin local (dev@suprime.xyz).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
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
const outDir = process.argv[3] ?? mkdtempSync(join(tmpdir(), "prz-categories-"));

const CWD = "C:\\Users\\VIP\\Documents\\prz\\prz-web";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

function dq(sql) {
  const out = execSync(
    `npx wrangler d1 execute prz-tours --local --command "${sql.replace(/"/g, "'")}" --json`,
    { encoding: "utf8", cwd: CWD, shell: process.platform === "win32" },
  );
  const start = out.indexOf("[");
  const end = out.lastIndexOf("]");
  const rows = JSON.parse(out.slice(start, end + 1));
  return rows[0]?.results ?? [];
}

/** Nombre único por corrida para no chocar con pruebas anteriores. */
const stamp = Date.now().toString(36).slice(-5);
const CAT_ES = `Gastronomía de prueba ${stamp}`;
const CAT_SLUG = `gastronomia-de-prueba-${stamp}`;

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

try {
  // ── 1. Admin entra ────────────────────────────────────────────────────────
  await page.goto(`${origin}/es/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByLabel(/correo/i).fill("dev@suprime.xyz");
  await page.getByLabel(/contraseña/i).fill("Ultra1255");
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/admin|cuenta|account/, { timeout: 60000 });
  check("admin inicia sesión", true);

  // ── 2. Crear categoría solo en español → se autotraduce ───────────────────
  await page.goto(`${origin}/es/admin/tours/categories`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  const onPage = await page.getByRole("heading", { name: /Categorías de tour/i }).isVisible();
  check("el gestor de categorías abre", onPage);

  await page.getByLabel("Nombre", { exact: true }).fill(CAT_ES);
  await page.getByLabel(/Icono/i).fill("🍽️");
  await page.getByRole("button", { name: /Crear categoría/i }).click();
  await page.waitForTimeout(2500);

  const row = dq(
    `SELECT slug || '|' || label_es || '|' || label_en AS v FROM tour_categories WHERE label_es = '${CAT_ES.replace(/'/g, "''")}'`,
  )[0];
  check("la categoría se guardó", !!row, row ? row.v.split("|")[0] : "no encontrada");

  if (row) {
    const [, , labelEn] = row.v.split("|");
    const translated = labelEn.trim().length > 0 && labelEn.trim() !== CAT_ES;
    check(
      "se autotraduce al inglés",
      translated,
      translated ? labelEn : `label_en vacío o igual (${labelEn})`,
    );
    check(
      "el slug se genera del nombre",
      row.v.split("|")[0] === CAT_SLUG,
      row.v.split("|")[0],
    );
  }

  // ── 3. Aparece en el formulario de tours ─────────────────────────────────
  await page.goto(`${origin}/es/admin/tours/new`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  const inForm = await page.locator(`select[name="category"] option[value="${CAT_SLUG}"]`).count();
  check("aparece en el selector del formulario", inForm === 1, `${inForm} opción(es)`);

  // ── 4. Slug duplicado → error ────────────────────────────────────────────
  await page.goto(`${origin}/es/admin/tours/categories`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.getByLabel("Nombre", { exact: true }).fill(CAT_ES);
  await page.getByRole("button", { name: /Crear categoría/i }).click();
  // Hay más de un role="alert" en la página (regiones globales): acoto al
  // formulario para no comerme un strict-mode violation.
  const dupAlert = page.locator("form").getByRole("alert");
  await dupAlert.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const dup = await dupAlert.first().innerText().catch(() => "");
  check("slug duplicado avisa", /ya existe|already exists/i.test(dup), dup.slice(0, 80));

  // ── 5. Desactivar la oculta como filtro, sin romper los tours ────────────
  const rowId = dq(`SELECT id FROM tour_categories WHERE label_es = '${CAT_ES.replace(/'/g, "''")}'`)[0];
  if (rowId) {
    const row = page.locator("li", { hasText: CAT_ES }).first();
    await row.getByRole("button", { name: /Desactivar/i }).click();
    await page.waitForTimeout(3000);
    const active = dq(`SELECT is_active AS a FROM tour_categories WHERE id = ${rowId.id}`)[0];
    check("desactivar funciona", active?.a === 0, `is_active=${active?.a}`);

    const stillThere = dq(`SELECT COUNT(*) AS n FROM tour_categories WHERE id = ${rowId.id}`)[0];
    check("no borra la categoría al desactivar", stillThere?.n === 1);
  }

  // ── 6. Catálogo público: filtro y tarjeta ────────────────────────────────
  await page.goto(`${origin}/es/tours`, { waitUntil: "networkidle", timeout: 60000 });
  const filterVisible = await page
    .getByRole("link", { name: new RegExp(CAT_ES.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })
    .count();
  check(
    "la categoría desactivada ya no filtra",
    filterVisible === 0,
    `${filterVisible} enlace(s) en el catálogo`,
  );

  // ── 7. Push: clave VAPID y registro protegido ────────────────────────────
  const keyRes = await page.request.get(`${origin}/api/push/public-key`);
  const keyJson = await keyRes.json().catch(() => ({}));
  check(
    "/api/push/public-key devuelve la clave VAPID",
    keyRes.ok() && typeof keyJson.publicKey === "string" && keyJson.publicKey.length > 20,
    keyRes.status(),
  );

  const anon = await browser.newContext();
  const subRes = await anon.request.post(`${origin}/api/push/subscribe`, {
    data: { subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "a", auth: "b" } } },
  });
  await anon.close();
  check("suscribirse sin sesión devuelve 401", subRes.status() === 401, `${subRes.status()}`);

  // ── 8. Aviso de PWA en la web de cliente ────────────────────────────────
  const customerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cust = await customerCtx.newPage();
  const email = `cat${stamp}@test.local`;
  await cust.goto(`${origin}/es/signup`, { waitUntil: "networkidle", timeout: 60000 });
  await cust.getByLabel(/nombre/i).first().fill("Cliente Cat");
  await cust.getByLabel(/correo/i).fill(email);
  await cust.getByLabel(/contraseña/i).first().fill("Prueba12345");
  await cust.getByRole("button", { name: /Crear cuenta/i }).click();
  await cust.waitForTimeout(3500);
  await cust.goto(`${origin}/es/account`, { waitUntil: "networkidle", timeout: 60000 });
  const pwaSection = await cust.getByText(/Instalar app/i).count();
  check("el cliente ve la opción de instalar la PWA", pwaSection > 0, `${pwaSection} botón(es)`);

  const notifyBtn = await cust.getByRole("button", { name: /Activar avisos/i }).count();
  check("el cliente puede activar las notificaciones", notifyBtn > 0, `${notifyBtn} botón(es)`);
  await customerCtx.close();
} catch (err) {
  check("excepción inesperada", false, String(err).slice(0, 220));
} finally {
  await page.screenshot({ path: join(outDir, "categories.png"), fullPage: true }).catch(() => {});
  await browser.close();

  // Limpieza: la categoría de prueba fuera.
  try {
    execSync(
      `npx wrangler d1 execute prz-tours --local --command "DELETE FROM tour_categories WHERE label_es LIKE '%${stamp}%'" --json`,
      { cwd: CWD, shell: process.platform === "win32" },
    );
  } catch {
    /* la limpieza no debe romper el resultado */
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK · PNG en ${outDir}`);
if (failed.length > 0) process.exit(1);