/**
 * Test del programa de fidelidad (`npm run test:loyalty`).
 *
 * Uso:
 *   node scripts/test-loyalty.mjs [origen] [salida]
 *
 * Flujo completo en el dev local:
 *  1. Usuario A se registra → obtiene su código de invitado.
 *  2. Usuario B se registra con `?ref=` → recibe cupón de invitado.
 *  3. B reserva usando su cupón → descuento aplicado (verificado en D1).
 *  4. El cupón de B no le sirve a A (anti-abuso por propiedad).
 *  5. Admin confirma+completa 2 reservas de B → cupón recurrente automático.
 *  6. B usa el recurrente en una 3ª reserva → queda marcado usado.
 *  7. Admin crea un cupón manual para B desde el panel.
 *
 * Requiere el dev corriendo y un admin local (dev@suprime.xyz).
 * Crea usuarios y reservas de prueba en la D1 local.
 */
import { execSync } from "node:child_process";
import { chromium } from "playwright-core";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
const outDir = process.argv[3] ?? mkdtempSync(join(tmpdir(), "prz-loyalty-"));

/**
 * Correo de los usuarios de prueba.
 *
 * Por defecto `example.com`, que Resend rechaza a propósito, así que la
 * batería normal no genera correo real. Para comprobar que los correos de
 * confirmación/completado salen de verdad, pasa una dirección real como 4º
 * argumento; cada usuario recibe una etiqueta distinta (`+a`, `+b`) porque el
 * registro es único por correo y Gmail entrega las etiquetas al mismo buzón.
 *
 *   node scripts/test-loyalty.mjs http://localhost:3000 <png> correo@real.com
 */
const emailReal = process.argv[4] ?? "";
const stamp = Date.now();
const tagged = (user) => {
  if (!emailReal) return `test-loy-${user}-${stamp}@example.com`;
  const [nombre, dom] = emailReal.split("@");
  return `${nombre}+${user}@${dom}`;
};

// En producción hay que leer la D1 remota (con el token correcto).
const REMOTE = !/localhost|127\.0\.0\.1/.test(origin);
const WR = REMOTE
  ? "node scripts/with-secrets.mjs -- npx wrangler"
  : "npx wrangler";
const DBFLAG = REMOTE ? "--remote" : "--local";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

function dq(sql) {
  const cmd =
    `${WR} d1 execute prz-tours ${DBFLAG} --command "${sql.replace(/"/g, "'")}" --json`;
  const out = execSync(cmd, {
    encoding: "utf8",
    cwd: "C:\\Users\\VIP\\Documents\\prz\\prz-web",
    shell: process.platform === "win32",
  });
  const start = out.indexOf("[");
  const end = out.lastIndexOf("]");
  const arr = JSON.parse(out.slice(start, end + 1));
  return arr[0]?.results ?? [];
}

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const emailA = tagged("a");
const emailB = tagged("b");

async function signup(page, name, email) {
  await page.goto(`${origin}/es/signup`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("testpass123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await page.waitForURL("**/es/account", { timeout: 30000 });
}

async function login(page, email, password) {
  await page.goto(`${origin}/es/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForTimeout(4000);
}

async function bookTour(page, { name, email, promo = "" }) {
  await page.goto(`${origin}/es/book`, { waitUntil: "networkidle", timeout: 60000 });
  const tourValue = await page.locator("#tourId option").evaluateAll((opts) =>
    opts.map((o) => o.value).find((v) => v !== ""),
  );
  await page.locator("#tourId").selectOption(tourValue);
  await page.locator("#customerName").fill(name);
  await page.locator("#customerEmail").fill(email);
  await page.locator("#customerPhone").fill("+18090000000");
  if (promo) await page.locator("#promoCode").fill(promo);
  await page.getByRole("button", { name: /solicitar reserva/i }).click();
  await page.getByText(/solicitud recibida/i).waitFor({ timeout: 30000 });
  const m = ((await page.textContent("body")) ?? "").match(/PRZ-[A-Z0-9]{6}/);
  return m ? m[0] : null;
}

// ── 1-2) A se registra; B llega con su enlace ──
const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageA = await ctxA.newPage();
await signup(pageA, "Loy A", emailA);
const invitePath = await pageA.locator("section input[readonly]").first().inputValue().catch(() => "");
const inviteCode = (invitePath.match(/ref=([A-Z0-9]+)/) ?? [])[1] ?? "";
check("A tiene código de invitado", inviteCode.length >= 4, inviteCode);

const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageB = await ctxB.newPage();
await pageB.goto(`${origin}/es/signup?ref=${inviteCode}`, { waitUntil: "networkidle", timeout: 60000 });
await pageB.locator("#name").fill("Loy B");
await pageB.locator("#email").fill(emailB);
await pageB.locator("#password").fill("testpass123");
await pageB.getByRole("button", { name: /crear cuenta/i }).click();
await pageB.waitForURL("**/es/account", { timeout: 30000 });
await pageB.waitForTimeout(1500);
const inviteCoupon = ((await pageB.textContent("body")) ?? "").match(/PEREZ-[A-Z0-9]{6}/)?.[0] ?? "";
check("B recibe cupón de invitado", inviteCoupon.startsWith("PEREZ-"), inviteCoupon);

// ── 3) B reserva con su cupón → descuento ──
const ref1 = await bookTour(pageB, { name: "Loy B", email: emailB, promo: inviteCoupon });
const row1 = ref1 ? dq(`SELECT promo_code, discount_amount, total_price FROM bookings WHERE reference = '${ref1}'`) : [];
check(
  "cupón invitado aplica descuento",
  row1.length === 1 && Number(row1[0].discount_amount) > 0 && row1[0].promo_code === inviteCoupon,
  ref1 ? `${ref1} desc=${row1[0]?.discount_amount}` : "sin referencia",
);

// ── 4) El cupón de B no le sirve a A ──
await pageA.goto(`${origin}/es/book`, { waitUntil: "networkidle", timeout: 60000 });
{
  const tourValue = await pageA.locator("#tourId option").evaluateAll((opts) =>
    opts.map((o) => o.value).find((v) => v !== ""),
  );
  await pageA.locator("#tourId").selectOption(tourValue);
  await pageA.locator("#customerName").fill("Loy A");
  await pageA.locator("#customerEmail").fill(emailA);
  await pageA.locator("#customerPhone").fill("+18090000000");
  await pageA.locator("#promoCode").fill(inviteCoupon);
  await pageA.getByRole("button", { name: /solicitar reserva/i }).click();
  await pageA.waitForTimeout(4000);
  const body = await pageA.innerText("body");
  check(
    "cupón ajeno se rechaza",
    /código no es válido/i.test(body) && !/PRZ-[A-Z0-9]{6}/.test(body),
  );
}

// ── 5) Admin completa 2 reservas de B → cupón recurrente ──
const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageAdmin = await ctxAdmin.newPage();
await login(pageAdmin, "dev@suprime.xyz", "Ultra1255");
const ref2 = await bookTour(pageB, { name: "Loy B", email: emailB });
check("2ª reserva de B", ref2 != null, ref2 ?? "");
for (const ref of [ref1, ref2]) {
  await pageAdmin.goto(`${origin}/es/admin/bookings`, { waitUntil: "networkidle", timeout: 60000 });
  await pageAdmin.getByRole("link", { name: new RegExp(ref) }).first().click();
  await pageAdmin.getByRole("button", { name: /^confirmar$/i }).click({ timeout: 30000 });
  await pageAdmin.getByText("Listo.", { exact: true }).waitFor({ timeout: 30000 });
  await pageAdmin.getByRole("button", { name: /^completar$/i }).click({ timeout: 30000 });
  await pageAdmin.getByText("Listo.", { exact: true }).waitFor({ timeout: 30000 });
}
await pageAdmin.screenshot({ path: join(outDir, "admin-bookings.png") });
const loyaltyRows = dq(
  `SELECT code, status, reason FROM coupons WHERE user_id = (SELECT id FROM users WHERE email = '${emailB}') AND reason = 'loyalty'`,
);
check(
  "cupón recurrente automático tras 2 viajes",
  loyaltyRows.length >= 1 && loyaltyRows[0].status === "active",
  JSON.stringify(loyaltyRows[0] ?? null),
);
const loyaltyCode = loyaltyRows[0]?.code ?? "";

// ── 6) B usa el recurrente → queda usado ──
const ref3 = await bookTour(pageB, { name: "Loy B", email: emailB, promo: loyaltyCode });
const row3 = ref3 ? dq(`SELECT promo_code, discount_amount FROM bookings WHERE reference = '${ref3}'`) : [];
const couponRow = loyaltyCode
  ? dq(`SELECT status FROM coupons WHERE code = '${loyaltyCode}'`)
  : [];
check(
  "recurrente aplica y se consume",
  row3.length === 1 &&
    Number(row3[0].discount_amount) > 0 &&
    couponRow[0]?.status === "used",
  `${ref3} desc=${row3[0]?.discount_amount} estado=${couponRow[0]?.status}`,
);

// ── 7) Admin crea cupón manual para B ──
await pageAdmin.goto(`${origin}/es/admin/coupons`, { waitUntil: "networkidle", timeout: 60000 });
await pageAdmin.locator('input[name="email"]').fill(emailB);
await pageAdmin.getByRole("button", { name: /^crear$/i }).click();
await pageAdmin.waitForTimeout(3000);
await pageAdmin.screenshot({ path: join(outDir, "admin-coupons.png") });
const manualRows = dq(
  `SELECT code, status FROM coupons WHERE user_id = (SELECT id FROM users WHERE email = '${emailB}') AND reason = 'manual'`,
);
check("cupón manual desde el panel", manualRows.length >= 1, JSON.stringify(manualRows[0] ?? null));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK · PNG en ${outDir}`);
writeFileSync(join(outDir, "report.json"), JSON.stringify({ origin, results }, null, 2));
if (failed.length > 0) process.exitCode = 1;
