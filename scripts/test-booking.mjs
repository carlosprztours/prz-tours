/**
 * Test de reserva con login obligatorio (`npm run test:booking`).
 *
 * Uso:
 *   node scripts/test-booking.mjs [url] [salida]
 *
 * Fase A (sin sesión): llena el formulario, intenta reservar → debe salir
 * el modal de login sin navegar ni perder datos. Va a "Regístrate",
 * crea la cuenta y vuelve a /book con el borrador restaurado → reserva OK.
 * Fase B (con sesión): reserva directa con 5 invitados del desplegable 2–11
 * y verifica que /track los muestre. Incluye la animación de éxito.
 *
 * Crea DOS reservas y DOS usuarios reales en la D1 local (bórralos en el
 * panel si quieres). Requiere el dev corriendo (`npm run dev`).
 */
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

const url = process.argv[2] ?? "http://localhost:3000/es/book";
const outDir = process.argv[3] ?? mkdtempSync(join(tmpdir(), "prz-booking-"));
const origin = new URL(url).origin;

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

async function fillBookingForm(page, { name, email }) {
  const tourValue = await page.locator("#tourId option").evaluateAll((opts) =>
    opts.map((o) => o.value).find((v) => v !== ""),
  );
  await page.locator("#tourId").selectOption(tourValue);
  await page.locator("#customerName").fill(name);
  await page.locator("#customerEmail").fill(email);
  await page.locator("#customerPhone").fill("+18090000000");
}

async function submitAndWaitSuccess(page, shotPrefix) {
  await page.getByRole("button", { name: /solicitar reserva/i }).click();
  await page.getByText(/solicitud recibida/i).waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, `${shotPrefix}-mid.png`) });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outDir, `${shotPrefix}-final.png`) });
  return page.evaluate(() => {
    const ref = document.body.innerText.match(/PRZ-[A-Z0-9]{6}/);
    const svg = document.querySelector("svg circle.draw-anim, svg .draw-anim");
    const whats = [...document.querySelectorAll("a")].some((a) =>
      /continuar por whatsapp/i.test(a.textContent),
    );
    return {
      reference: ref ? ref[0] : null,
      animatedCheck: svg != null,
      whatsappBtn: whats,
    };
  });
}

// ── Fase A: sin sesión → modal, registro, borrador restaurado ──
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err).split("\n")[0].slice(0, 200)));

  const stamp = Date.now();
  const email = `test-book-${stamp}@example.com`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await fillBookingForm(page, { name: "Test Borrador", email });
  await page.getByRole("button", { name: /solicitar reserva/i }).click();
  await page.waitForTimeout(800);

  const modal = await page.getByRole("dialog").count();
  check("sin sesión: sale el modal de login", modal > 0);
  check("sin sesión: no navega", page.url().includes("/es/book"), page.url());
  await page.screenshot({ path: join(outDir, "A-modal.png") });

  // Va a registrarse: el borrador debe sobrevivir a la navegación.
  await page.getByRole("link", { name: /regístrate|sign up/i }).click();
  await page.waitForURL("**/es/signup?next=**", { timeout: 30000 });
  await page.locator("#name").fill("Test Borrador");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("testpass123");
  await page.getByRole("button", { name: /crear cuenta|create account/i }).click();
  await page.waitForURL("**/es/book**", { timeout: 30000 });
  check("tras registro: vuelve a la reserva", page.url().includes("/es/book"), page.url());

  const restoredName = await page.locator("#customerName").inputValue();
  const restoredTour = await page.locator("#tourId").inputValue();
  check("borrador restaurado", restoredName === "Test Borrador" && restoredTour !== "", `${restoredName}/${restoredTour}`);

  const ok = await submitAndWaitSuccess(page, "A-success");
  check("reserva tras login (ref)", ok.reference != null, ok.reference ?? "sin referencia");
  check("sin pageerrors (fase A)", pageErrors.length === 0, pageErrors[0] ?? "");
  await page.close();
}

// ── Fase B: con sesión → reserva directa + desplegable 2–11 ──
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err).split("\n")[0].slice(0, 200)));

  const stamp = Date.now();
  const email = `test-book2-${stamp}@example.com`;
  await page.goto(`${origin}/es/signup`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#name").fill("Test Directo");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("testpass123");
  await page.getByRole("button", { name: /crear cuenta|create account/i }).click();
  await page.waitForURL("**/es/account", { timeout: 30000 });

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await fillBookingForm(page, { name: "Test Directo", email });
  const guestsKind = await page.locator("#guests").evaluate((el) => el.tagName);
  const guestOptions = await page.locator("#guests option").evaluateAll((opts) =>
    opts.map((o) => o.value),
  );
  check("invitados es desplegable 2–11", guestsKind === "SELECT", `${guestsKind} [${guestOptions.join(",")}]`);
  await page.locator("#guests").selectOption("5");

  const ok = await submitAndWaitSuccess(page, "B-success");
  check("reserva directa (ref)", ok.reference != null, ok.reference ?? "sin referencia");
  check("check animado presente", ok.animatedCheck === true);
  check("botón continuar por WhatsApp", ok.whatsappBtn === true);

  let guestsOk = false;
  if (ok.reference) {
    await page.goto(`${origin}/es/track?ref=${ok.reference}&email=${email}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    guestsOk = await page.evaluate(() => {
      const dts = [...document.querySelectorAll("dt")];
      const dt = dts.find((el) => /persona|guest/i.test(el.textContent ?? ""));
      return dt?.nextElementSibling?.textContent?.trim() === "5";
    });
  }
  check("reserva guarda 5 invitados", guestsOk === true);

  // Menú flotante de WhatsApp: con reservas, ofrece elegir y autorrellena.
  await page.goto(`${origin}/es`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /escríbenos por whatsapp/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole("menuitem", { name: /confirmar mi reserva|confirm my booking/i }).click();
  await page.waitForFunction(
    () => !/buscando tus reservas|finding your bookings/i.test(document.body.innerText),
    { timeout: 30000 },
  ).catch(() => {});
  const waMenu = await page.evaluate(() => document.body.innerText);
  const waRef = (waMenu.match(/PRZ-[A-Z0-9]{6}/g) ?? []).filter((v, i, a) => a.indexOf(v) === i);
  check("whatsapp: lista reservas para confirmar", waRef.length >= 1, waRef.join(","));
  if (waRef.length > 0) {
    const first = waRef[0];
    const btn = page.getByRole("button", { name: new RegExp(first) }).first();
    if ((await btn.count()) > 0) await btn.click();
    else await page.locator('input[placeholder*="PRZ"]').fill(first);
    await page.waitForTimeout(400);
    const goHref = await page.getByRole("link", { name: /continuar|continue/i }).first().getAttribute("href").catch(() => "");
    check("whatsapp: autorrellena la referencia", (goHref ?? "").includes(encodeURIComponent(first)), (goHref ?? "").slice(-60));
  }
  await page.screenshot({ path: join(outDir, "B-whatsapp.png") });
  check("sin pageerrors (fase B)", pageErrors.length === 0, pageErrors[0] ?? "");
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK · PNG en ${outDir}`);
writeFileSync(join(outDir, "report.json"), JSON.stringify({ url, results }, null, 2));
if (failed.length > 0) process.exitCode = 1;
