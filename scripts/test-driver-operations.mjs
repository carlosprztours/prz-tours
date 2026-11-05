/** Focused browser integration test. Only starts a loopback Worker and disposable D1. */
import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const temp = mkdtempSync(".qa-driver-");
const origin = "http://localhost:8795";
const secret = randomBytes(32).toString("hex");
const password = randomBytes(24).toString("hex");
const salt = randomBytes(16);
const hash = ["pbkdf2-sha256", 100000, salt.toString("base64"),
  pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("base64")].join("$");
const roles = ["admin", "driver", "driver", "editor", "photographer", "customer"];
const config = `${temp}/wrangler.json`;
const wrangler = "node_modules/.bin/wrangler";
const dbArgs = ["--local", "--config", config, "--persist-to", `${temp}/d1`];
const envFile = `${temp}/.dev.vars`;

function d1(...args) {
  return JSON.parse(execFileSync(wrangler, ["d1", "execute", "DB", ...dbArgs, "--json", ...args], { encoding: "utf8" }));
}
function sql(statement) {
  return d1("--command", statement).at(-1).results;
}

let worker;
let browser;
try {
  writeFileSync(config, JSON.stringify({
    name: "prz-driver-local-qa", main: "../.open-next/worker.js",
    compatibility_date: "2025-04-01", compatibility_flags: ["nodejs_compat"],
    assets: { directory: "../.open-next/assets", binding: "ASSETS" },
    vars: { DISABLE_EXTERNAL_BOOKING_EFFECTS: "true", EDITORIAL_TRANSLATION_WORKERS_AI: "false" },
    d1_databases: [{ binding: "DB", database_name: "driver-qa", database_id: "00000000-0000-4000-8000-000000000019" }],
  }));
  writeFileSync(envFile, `AUTH_SECRET=${secret}\n`, { mode: 0o600 });
  const migrations = readdirSync("migrations").filter((file) => file.endsWith(".sql")).sort();
  for (const migration of migrations.filter((file) => file < "0019")) d1("--file", `migrations/${migration}`);
  const fixtures = roles.map((role, index) => `(${index + 1},'qa${index + 1}@example.test','QA ${index + 1}','${hash}','${role === "driver" ? "editor" : role}')`);
  sql(`INSERT INTO users(id,email,name,password_hash,role) VALUES ${fixtures.join(",")};
       INSERT INTO sessions(id,user_id,expires_at) VALUES ('before',1,'2099-01-01');
       INSERT INTO coupons(id,code,user_id) VALUES (1,'QA-PRESERVE',6);
       INSERT INTO bookings(id,reference,customer_name,customer_email,customer_phone,tour_title,hotel,booked_for,pickup_time,status,user_id,payment_status)
       VALUES (1,'QA-SERVICE-1','QA Customer','qa6@example.test','555-0101','Destination','Hotel','2030-01-01','09:00','confirmed',6,'paid'),
              (2,'QA-SERVICE-2','Other','qa6@example.test','555-0102','Second','Hotel','2030-01-01','09:00','confirmed',6,'paid');`);
  for (const migration of migrations.filter((file) => file >= "0019")) d1("--file", `migrations/${migration}`);
  assert.equal(sql("SELECT role FROM users WHERE id=1")[0].role, "admin");
  assert.equal(sql("SELECT user_id FROM sessions WHERE id='before'")[0].user_id, 1);
  assert.equal(sql("SELECT user_id FROM coupons WHERE id=1")[0].user_id, 6);
  assert.equal(sql("SELECT user_id FROM bookings WHERE id=1")[0].user_id, 6);
  assert.equal(sql("SELECT payment_status FROM bookings WHERE id=1")[0].payment_status, "paid");
  assert.deepEqual(sql("PRAGMA foreign_key_check"), []);
  sql("UPDATE users SET role='driver' WHERE id IN (2,3)");
  worker = spawn(wrangler, ["dev", ...dbArgs, "--port", "8795"], { stdio: "ignore" });
  for (let attempt = 0; attempt < 45; attempt++) {
    if ((await fetch(origin + "/es/login").catch(() => null))?.ok) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert((await fetch(origin + "/es/login")).ok, "Isolated Worker did not start");
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  async function login(id, expected) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(origin + "/es/login");
    await page.locator("#email").fill(`qa${id}@example.test`);
    await page.locator("#password").fill(password);
    await page.locator("form").filter({ has: page.locator("#password") }).locator("button[type=submit]").click();
    await page.waitForURL(origin + expected);
    return page;
  }
  const admin = await login(1, "/es/admin");
  const driver = await login(2, "/es/admin/services");
  const other = await login(3, "/es/admin/services");
  const editor = await login(4, "/es/admin");
  const photographer = await login(5, "/es/admin/gallery");
  const customer = await login(6, "/es/account");
  async function accessDenied(page, path, confidential = /QA-SERVICE-1|Teléfono de recogida/) {
    const response = await page.goto(origin + path);
    assert(response.status() === 404 || new URL(page.url()).pathname !== path
      || /404|not (be )?found|no se encontr/i.test(await page.locator("body").innerText()));
    assert(!confidential.test(await page.locator("body").innerText()), `Operational data visible from ${path}`);
  }
  for (const page of [editor, photographer]) await accessDenied(page, "/es/admin/services");
  await accessDenied(customer, "/es/admin/services", /Panel de conducción|Teléfono de recogida/);
  assert.equal(new URL(customer.url()).pathname, "/es/account");
  for (const path of ["/es/admin/bookings", "/es/admin/bookings/1", "/es/admin/assignments", "/es/admin/users", "/es/admin/settings", "/es/admin/gallery"]) {
    await accessDenied(driver, path);
  }
  await admin.goto(origin + "/es/admin/assignments");
  async function assign(booking, driverId, ok) {
    await admin.locator("select[name=booking]").selectOption(booking);
    await admin.locator("select[name=driver]").selectOption(driverId);
    await admin.getByRole("button", { name: "Asignar", exact: true }).click();
    await admin.getByText(ok ? "Guardado." : "No se aplicó.", { exact: ok }).waitFor();
  }
  await assign("1:0", "2", true);
  await admin.reload();
  await assign("2:0", "2", false);
  assert.equal(sql("SELECT count(*) AS n FROM service_assignments")[0].n, 1);

  await admin.goto(origin + "/es/admin/services/1");
  await admin.getByRole("button", { name: "Generar o renovar QR" }).click();
  const token = await admin.locator("p.font-mono").innerText();
  await admin.getByRole("img", { name: "Código QR del servicio" }).waitFor();
  await admin.getByRole("button", { name: "Revocar QR" }).click();
  await admin.reload();
  await admin.getByRole("button", { name: "Generar o renovar QR" }).click();
  const currentToken = await admin.locator("p.font-mono").innerText();
  assert.notEqual(currentToken, token);

  await accessDenied(other, "/es/admin/services/1");
  async function scan(page, value, ok) {
    await page.goto(origin + "/es/admin/qr#" + value);
    await page.reload();
    await page.waitForFunction((token) => document.querySelector("input[name=token]")?.value === token, value);
    await page.getByLabel("Código o enlace QR").waitFor();
    assert.equal(await page.getByLabel("Código o enlace QR").inputValue(), value);
    await page.getByRole("button", { name: "Validar", exact: true }).click();
    await page.getByText(ok ? "Guardado." : "No se aplicó.", { exact: ok }).waitFor();
  }
  await scan(other, currentToken, false);
  await scan(driver, token, false);
  await scan(driver, currentToken, true);
  await scan(driver, currentToken, false);
  assert.equal(sql("SELECT validated_by FROM service_qr_codes WHERE validated_at IS NOT NULL")[0].validated_by, 2);

  await driver.goto(origin + "/es/admin/services/1");
  await driver.getByText("555-0101", { exact: true }).waitFor();
  for (const name of ["Registrar llegada", "Iniciar servicio", "Finalizar servicio"]) {
    await driver.getByRole("button", { name }).click();
  }
  await driver.getByRole("button", { name: "Finalizar servicio" }).waitFor({ state: "hidden" });
  assert.equal(sql("SELECT status FROM bookings WHERE id=1")[0].status, "confirmed");
  assert.equal(sql("SELECT loyalty_trips FROM users WHERE id=6")[0].loyalty_trips, 0);
  assert.equal(await driver.getByText("555-0101", { exact: true }).count(), 0);

  await admin.goto(origin + "/es/admin/assignments");
  await assign("2:0", "2", true);
  await admin.reload();
  await assign("2:2", "3", true);
  assert.equal(sql("SELECT count(*) AS n FROM service_assignments WHERE booking_id=2 AND withdrawn_at IS NOT NULL")[0].n, 1);
  await accessDenied(driver, "/es/admin/services/3", /QA-SERVICE-2|555-0102/);
  await other.goto(origin + "/es/admin/services/3");
  await other.getByText("555-0102", { exact: true }).waitFor();
  await admin.goto(origin + "/es/admin/services/3");
  await admin.getByRole("button", { name: "Generar o renovar QR" }).click();
  const adminToken = await admin.locator("p.font-mono").innerText();
  await scan(admin, adminToken, true);
  assert.equal(sql("SELECT validated_by FROM service_qr_codes WHERE assignment_id=3")[0].validated_by, 1);

  sql("UPDATE users SET is_active=0 WHERE id=3");
  assert.equal(sql("SELECT count(*) AS n FROM sessions WHERE user_id=3")[0].n, 0);
  assert.equal(sql("SELECT count(*) AS n FROM service_assignments WHERE driver_id=3 AND withdrawn_at IS NULL")[0].n, 0);
  await accessDenied(other, "/es/admin/services/3", /QA-SERVICE-2|555-0102/);
  assert.deepEqual(sql("PRAGMA foreign_key_check"), []);
  // Two open tabs submit the same commercial transition. Both render from
  // the confirmed row, but only one may record a trip.
  const secondAdmin = await login(1, "/es/admin");
  for (const page of [admin, secondAdmin]) await page.goto(origin + "/es/admin/bookings/1");
  await Promise.all([admin, secondAdmin].map(async (page) => {
    const response = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Completar", exact: true }).click();
    await (await response).finished();
  }));
  assert.equal(sql("SELECT status FROM bookings WHERE id=1")[0].status, "completed");
  assert.equal(sql("SELECT loyalty_trips FROM users WHERE id=6")[0].loyalty_trips, 1);
  assert.equal(sql("SELECT count(*) AS n FROM booking_events WHERE booking_id=1 AND to_status='completed'")[0].n, 1);
  console.log("PASS: D1 migration preservation, role matrix, assignment and history, conflict, QR, operational stages and session revocation");
} finally {
  await browser?.close();
  if (worker) {
    worker.kill();
    await new Promise((resolve) => {
      if (worker.exitCode !== null || worker.signalCode !== null) resolve();
      else worker.once("exit", resolve);
    });
  }
  rmSync(temp, { recursive: true, force: true });
}
