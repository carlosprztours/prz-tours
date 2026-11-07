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
  const fixtures = roles.map((role, index) => `(${index + 1},'${index === 0 ? "dev@suprime.xyz" : `qa${index + 1}@example.test`}','QA ${index + 1}','${hash}','${role === "driver" ? "editor" : role}')`);
  sql(`INSERT INTO users(id,email,name,password_hash,role) VALUES ${fixtures.join(",")};
       INSERT INTO sessions(id,user_id,expires_at) VALUES ('before',1,'2099-01-01');
       INSERT INTO coupons(id,code,user_id) VALUES (1,'QA-PRESERVE',6);
       INSERT INTO bookings(id,reference,customer_name,customer_email,customer_phone,tour_title,hotel,booked_for,pickup_time,status,user_id,payment_status)
       VALUES (1,'QA-SERVICE-1','QA Customer','qa6@example.test','555-0101','Destination','Hotel','2030-01-01','09:00','confirmed',6,'paid'),
              (2,'QA-SERVICE-2','Other','qa6@example.test','555-0102','Second','Hotel','2030-01-01','09:00','confirmed',NULL,'paid');`);
  for (const migration of migrations.filter((file) => file >= "0019" && file < "0021")) d1("--file", `migrations/${migration}`);
  sql(`INSERT INTO gallery_images(id,url,alt,sort_order)
       VALUES (69,'/icons/icon-192.png','Private Airport Transfers in Puerto Plata, Dominican Republic',-2),
              (71,'/icons/icon-512.png','Good air conditioner and confort',-1);`);
  for (const migration of migrations.filter((file) => file >= "0021")) d1("--file", `migrations/${migration}`);
  d1("--file", "migrations/0021_reviewed_public_copy.sql");
  assert.deepEqual(sql("SELECT id,url FROM gallery_images WHERE id IN (69,71) ORDER BY id"), [
    {id:69,url:"/icons/icon-192.png"}, {id:71,url:"/icons/icon-512.png"},
  ]);
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
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: id === 6, hasTouch: id === 6 });
    const page = await context.newPage();
    await page.goto(origin + "/es/login");
    await page.locator("#email").fill(id === 1 ? "dev@suprime.xyz" : `qa${id}@example.test`);
    await page.locator("#password").fill(password);
    await page.locator("form").filter({ has: page.locator("#password") }).locator("button[type=submit]").click();
    await page.waitForURL(origin + expected);
    return page;
  }
  const gallery = await browser.newPage();
  for (const [locale, alts] of [
    ["es", ["Traslados privados al aeropuerto en Puerto Plata, República Dominicana", "Aire acondicionado y comodidad"]],
    ["en", ["Private airport transfers in Puerto Plata, Dominican Republic", "Air conditioning and comfort"]],
  ]) {
    await gallery.goto(origin + `/${locale}/gallery`);
    for (const alt of alts) {
      await gallery.getByRole("button", { name: alt, exact: true }).click();
      await gallery.getByRole("img", { name: alt, exact: true }).waitFor();
      await gallery.keyboard.press("Escape");
    }
  }
  await gallery.close();
  const manifest = await (await fetch(origin + "/manifest.webmanifest")).json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/en");
  for (const icon of manifest.icons) {
    const response = await fetch(origin + icon.src);
    assert(response.ok);
    assert.match(response.headers.get("content-type"), /image\/png/);
  }
  const invalidOAuth = await fetch(origin + "/api/auth/google/callback?code=QA&state=invalid", { redirect: "manual" });
  assert.equal(new URL(invalidOAuth.headers.get("location")).pathname, "/en/login");
  assert(!invalidOAuth.headers.has("set-cookie"));
  const unauthenticatedPush = await fetch(origin + "/api/push/subscribe", { method: "POST", body: "{}" });
  assert.equal(unauthenticatedPush.status, 401);
  const admin = await login(1, "/es/admin");
  const driver = await login(2, "/es/admin/services");
  const other = await login(3, "/es/admin/services");
  const editor = await login(4, "/es/admin");
  const photographer = await login(5, "/es/admin/gallery");
  const customer = await login(6, "/es/account");
  const sw = await customer.evaluate(async () => Promise.race([
    navigator.serviceWorker.ready.then((registration) => registration.active?.scriptURL),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Service worker did not activate")), 10000)),
  ]));
  assert.equal(sw, origin + "/sw.js");
  await customer.evaluate(() => { Notification.requestPermission = async () => "denied"; });
  const notificationSummary = customer.locator("summary").filter({ hasText: /^Avisos$/ });
  await notificationSummary.press("Enter");
  const enableAlerts = customer.getByRole("button", { name: /activar avisos/i });
  await enableAlerts.waitFor();
  assert.equal(await enableAlerts.count(), 1);
  await enableAlerts.click();
  await customer.getByRole("status").filter({ hasText: /permiso|bloquead/i }).waitFor();
  assert.equal(sql("SELECT count(*) AS n FROM push_subscriptions")[0].n, 0);
  const keys = { p256dh: "A".repeat(87), auth: "A".repeat(22) };
  const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/qa-only", keys };
  const pushApi = origin + "/api/push/subscribe";
  const rejectedPush = await customer.request.post(pushApi, { data: { subscription: { ...subscription, endpoint: "https://fcm.googleapis.com.example.test/qa" } } });
  assert.equal(rejectedPush.status(), 400);
  assert((await customer.request.post(pushApi, { data: { subscription } })).ok());
  assert.equal(sql("SELECT user_id FROM push_subscriptions")[0].user_id, 6);
  assert((await customer.request.post(pushApi, { data: { endpoint: subscription.endpoint } })).ok());
  assert.equal(sql("SELECT count(*) AS n FROM push_subscriptions")[0].n, 0);
  for (const [page, expected] of [
    [admin, ["Reservas", "Conductores", "Servicios y asignaciones", "Panel de conducción", "Validación QR", "Clientes y fidelización"]],
    [driver, ["Panel de conducción", "Validación QR"]],
    [editor, ["Reservas"]],
    [photographer, []],
    [customer, []],
  ]) {
    await page.goto(origin + "/es/account");
    if (expected.length) await page.locator("summary").filter({ hasText: /^Gestión$/ }).click();
    assert.deepEqual(await page.getByRole("navigation", { name: "Gestión" }).getByRole("link").allTextContents(), expected);
  }
  async function accessDenied(page, path, confidential = /QA-SERVICE-1|Teléfono de recogida/) {
    const response = await page.goto(origin + path);
    assert(response.status() === 404 || new URL(page.url()).pathname !== path
      || /404|not (be )?found|no se encontr/i.test(await page.locator("body").innerText()));
    assert(!confidential.test(await page.locator("body").innerText()), `Operational data visible from ${path}`);
  }
  for (const page of [editor, photographer]) await accessDenied(page, "/es/admin/services");
  await customer.locator("summary").filter({ hasText: /^Mis reservas/ }).press("Enter");
  assert(await customer.getByText("QA-SERVICE-1", { exact: true }).isVisible());
  assert.equal(await customer.getByText("QA-SERVICE-2", { exact: true }).count(), 0);
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
    assert((await response).ok(), "Booking action response failed");
  }));
  assert.equal(sql("SELECT status FROM bookings WHERE id=1")[0].status, "completed");
  assert.equal(sql("SELECT loyalty_trips FROM users WHERE id=6")[0].loyalty_trips, 1);
  assert.equal(sql("SELECT count(*) AS n FROM booking_events WHERE booking_id=1 AND to_status='completed'")[0].n, 1);
  let passportVisit = 0;
  async function passport(progress, status, locale = "es") {
    await customer.goto(origin + `/${locale}/account?qa-passport=${++passportVisit}`);
    const card = customer.getByRole("region", { name: locale === "es" ? "Pasaporte Perez Tours" : "Perez Tours Passport" });
    await card.getByText(progress, { exact: true }).waitFor();
    await card.getByText(status, { exact: true }).waitFor();
    assert(await card.evaluate((section) => {
      const bounds = section.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
    }));
    const link = card.getByRole("link");
    await link.focus();
    await link.press("Enter");
    await customer.waitForURL((url) => url.hash === "#my-coupons");
    await customer.locator("#my-coupons").waitFor();
  }
  await passport("1 de 2 viajes completados", "Tienes un cupón activo.");
  sql(`UPDATE coupons SET status='cancelled' WHERE id=1;
       UPDATE users SET loyalty_trips=0 WHERE id=6;
       INSERT INTO bookings(id,reference,customer_name,customer_email,customer_phone,tour_title,hotel,booked_for,pickup_time,status,user_id,payment_status)
       VALUES (3,'QA-SERVICE-3','QA Customer','qa6@example.test','555-0101','Destination','Hotel','2030-01-01','09:00','confirmed',6,'paid'),
              (4,'QA-SERVICE-4','QA Customer','qa6@example.test','555-0101','Destination','Hotel','2030-01-02','09:00','confirmed',6,'paid');`);
  await passport("0 de 2 viajes completados", "Aún no tienes un cupón activo.");
  await Promise.all([admin, secondAdmin].map((page, i) => page.goto(origin + "/es/admin/bookings/" + (i + 3))));
  await Promise.all([admin, secondAdmin].map(async (page) => {
    const response = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Completar", exact: true }).click();
    assert((await response).ok());
  }));
  assert.deepEqual(sql("SELECT status FROM bookings WHERE id IN (3,4) ORDER BY id"), [{status: "completed"}, {status: "completed"}]);
  assert.equal(sql("SELECT count(*) AS n FROM booking_events WHERE booking_id IN (3,4) AND to_status='completed'")[0].n, 2);
  assert.equal(sql("SELECT loyalty_trips FROM users WHERE id=6")[0].loyalty_trips, 0);
  assert.deepEqual(sql("SELECT status,value,reason FROM coupons WHERE user_id=6 AND reason='loyalty'"), [{status: "active", value: 10, reason: "loyalty"}]);
  assert.equal(sql("SELECT count(*) AS n FROM notifications WHERE user_id=6 AND type='coupon'")[0].n, 1);
  await passport("0 of 2 trips completed", "You have an active coupon.", "en");
  sql("UPDATE coupons SET status='used', booking_id=4, used_at=datetime('now') WHERE user_id=6 AND reason='loyalty'");
  await passport("0 of 2 trips completed", "Your previous reward has been used.", "en");
  sql("UPDATE users SET invite_code=NULL WHERE id=6");
  const otherAccount = await customer.context().newPage();
  await Promise.all([customer, otherAccount].map((page) => page.goto(origin + "/en/account?qa-invite=1")));
  await Promise.all([customer, otherAccount].map((page) => page.locator("summary").filter({ hasText: /^Invitations$/ }).click()));
  const invitePaths = await Promise.all([customer, otherAccount].map((page) =>
    page.locator('input[readonly][value*="/signup?ref="]').inputValue()));
  assert.equal(invitePaths[0], invitePaths[1]);
  const [invitePath] = invitePaths;
  await otherAccount.close();
  const invited = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await invited.goto(origin + invitePath);
  await invited.locator("#name").fill("QA invited traveller");
  await invited.locator("#email").fill("qa-invited@example.test");
  await invited.locator("#password").fill(password);
  await invited.locator("form").filter({ has: invited.locator("#password") }).locator("button[type=submit]").click();
  await invited.waitForURL(origin + "/en/account");
  assert.deepEqual(sql(`SELECT u.referred_by,c.value,c.status FROM users u JOIN coupons c ON c.user_id=u.id
    WHERE u.email='qa-invited@example.test' AND c.reason='invite'`), [{referred_by:6,value:10,status:"active"}]);
  await invited.getByRole("region", { name: "Perez Tours Passport" }).getByText("You have an active coupon.").waitFor();
  await invited.close();
  const finance = "/es/admin/finance";
  for (const restricted of [editor, driver, customer]) await accessDenied(restricted, finance, /Cobros registrados/);
  await editor.goto(origin + "/es/admin/bookings/1");
  assert.equal(await editor.getByRole("button", {name: "Excluir de informes"}).count(), 0);
  const reportingChanges = async (page, label) => {
    await page.getByLabel("Motivo · " + label).fill("QA audit");
    await page.getByRole("button", {name: label, exact: true}).click();
    await page.getByRole("status").filter({hasText:"Cambio guardado."}).waitFor();
  };
  sql(`UPDATE bookings SET total_price=100,deposit_paid=80,status='cancelled' WHERE id=1;
       UPDATE bookings SET total_price=90,deposit_paid=30,payment_status='refunded' WHERE id=2;
       UPDATE bookings SET payment_status='unpaid',total_price=99 WHERE id=3;`);
  await reportingChanges(editor, "Archivar");
  assert.deepEqual(sql("SELECT status,deposit_paid FROM bookings WHERE id=1"), [{status:"cancelled",deposit_paid:80}]);
  await editor.goto(origin + "/es/admin/bookings");
  assert.equal(await editor.getByRole("link", {name:"QA-SERVICE-1",exact:true}).count(), 0);
  await editor.getByRole("link", {name:"Ver archivadas"}).click();
  await editor.getByRole("link", {name:"QA-SERVICE-1",exact:true}).first().waitFor();
  await admin.goto(origin + finance);
  await admin.getByText("110,00 USD", {exact:true}).waitFor();
  await admin.getByText("80,00 USD", {exact:true}).waitFor();
  const refund = admin.locator("dl > div").filter({hasText:"Reembolsos registrados"});
  assert.equal(await refund.locator("dd").innerText(), "1");
  await admin.goto(origin + "/es/admin/bookings/1");
  await reportingChanges(admin, "Excluir de informes");
  await admin.goto(origin + finance);
  assert.equal(await admin.locator("dl > div").filter({hasText:"Cobros excluidos"}).locator("dd").innerText(), "80,00 USD");
  assert.equal(await admin.locator("dl > div").filter({hasText:"Ingresos comerciales netos calculables"}).locator("dd").innerText(), "0,00 USD");
  await admin.goto(origin + "/es/admin/bookings/1");
  await reportingChanges(admin, "Reincorporar a informes");
  await reportingChanges(admin, "Restaurar");
  assert.deepEqual(sql("SELECT action, reason FROM booking_reporting_events WHERE booking_id=1 ORDER BY id"),
    ["archive","exclude","include","restore"].map(action => ({action,reason:"QA audit"})));
  assert.deepEqual(sql("PRAGMA foreign_key_check"), []);
  console.log("PASS: booking archive, restoration, finance access, exclusions, cancellation and unknown refund");
  console.log("PASS: two concurrent completions, one 10% reward, one coupon notification, passport in ES/EN");
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
