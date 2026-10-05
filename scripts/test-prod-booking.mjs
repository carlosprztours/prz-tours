/**
 * Reserva de prueba EN PRODUCCIÓN como un usuario existente.
 *
 * Uso:
 *   node scripts/test-prod-booking.mjs [origen] [login-email] [customer-email] [salida]
 *
 * - Entra por la UI con email+contraseña (la contraseña sale de
 *   `prz-secrets/tokens.env` → PROD_ADMIN_PASSWORD, nunca en argumentos).
 * - Reserva el primer tour con el email de cliente dado.
 * - Imprime la referencia para verificar correos y borrarla en el panel.
 *
 * CUIDADO: crea datos reales (usuario ya existe, reserva nueva).
 */
import { chromium } from "playwright-core";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

function loadTokens() {
  const p = "C:\\Users\\VIP\\Documents\\prz-secrets\\tokens.env";
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

const origin = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const loginEmail = process.argv[3] ?? "dev@suprime.xyz";
const customerEmail = process.argv[4] ?? loginEmail;
const outDir = process.argv[5] ?? mkdtempSync(join(tmpdir(), "prz-prod-"));
const password = loadTokens().PROD_ADMIN_PASSWORD;
if (!password) {
  console.error("FAIL  falta PROD_ADMIN_PASSWORD en tokens.env");
  process.exit(2);
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err).split("\n")[0].slice(0, 200)));

// Login por la UI.
await page.goto(`${origin}/es/login`, { waitUntil: "networkidle", timeout: 60000 });
await page.locator("#email").fill(loginEmail);
await page.locator("#password").fill(password);
await page.getByRole("button", { name: /^entrar$/i }).click();
await page.waitForFunction(
  () => /^\/(es|en)\/(account|admin)/.test(new URL(window.location.href).pathname),
  { timeout: 30000 },
);
check("login en producción", /^\/(es|en)\/(account|admin)/.test(new URL(page.url()).pathname), page.url());
await page.screenshot({ path: join(outDir, "01-logged.png") });

// Reserva como usuario logueado.
await page.goto(`${origin}/es/book`, { waitUntil: "networkidle", timeout: 60000 });
const tourValue = await page.locator("#tourId option").evaluateAll((opts) =>
  opts.map((o) => o.value).find((v) => v !== ""),
);
await page.locator("#tourId").selectOption(tourValue);
await page.locator("#customerName").fill("Prueba Producción");
await page.locator("#customerEmail").fill(customerEmail);
await page.locator("#customerPhone").fill("+18090000000");
await page.getByRole("button", { name: /solicitar reserva/i }).click();
await page.getByText(/solicitud recibida/i).waitFor({ timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: join(outDir, "02-success.png") });
const ref = await page.evaluate(() => {
  const m = document.body.innerText.match(/PRZ-[A-Z0-9]{6}/);
  return m ? m[0] : null;
});
check("reserva en producción", ref != null, ref ?? "sin referencia");
check("sin pageerrors", pageErrors.length === 0, pageErrors[0] ?? "");

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK · PNG en ${outDir}`);
writeFileSync(join(outDir, "report.json"), JSON.stringify({ origin, loginEmail, customerEmail, reference: ref, results }, null, 2));
if (failed.length > 0) process.exitCode = 1;
