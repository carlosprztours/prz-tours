/**
 * Test de autenticación: recordar-usuario, fallback de Google sin
 * configurar y ceremonia passkey completa con autenticador virtual.
 *
 * Uso:
 *   node scripts/test-auth.mjs [origen] [salida]
 *   node scripts/test-auth.mjs http://localhost:3000
 *
 * Pasos:
 *  1. Recuerda el último email (localStorage tras intento de login).
 *  2. `/api/auth/google` sin secretos → vuelve al login.
 *  3. Crea cuenta por la UI, registra un passkey (Face ID simulado),
 *     cierra sesión y entra solo con el passkey.
 *
 * Requiere el dev corriendo (`npm run dev`). Crea UN usuario de prueba
 * en la D1 local (email test-pk-<timestamp>@example.com).
 */
import { chromium, request as apiRequest } from "playwright-core";
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
const outDir = process.argv[3] ?? mkdtempSync(join(tmpdir(), "prz-auth-"));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err).split("\n")[0].slice(0, 200)));

// ── 1) Recuerda el último email ─────────────────────────────
await page.goto(`${origin}/es/login`, { waitUntil: "networkidle", timeout: 60000 });
await page.locator("#email").fill("recordado@example.com");
await page.locator("#password").fill("noexiste123");
await page.getByRole("button", { name: /^entrar$/i }).click();
await page.waitForTimeout(2500);
await page.reload({ waitUntil: "networkidle" });
const remembered = await page.locator("#email").inputValue();
check("recuerda último email", remembered === "recordado@example.com", remembered);

// ── 2) Google sin configurar → vuelve al login ──────────────
// (sin seguir la redirección: solo miramos el Location del 307)
const api = await apiRequest.newContext();
const gres = await api.get(`${origin}/api/auth/google?locale=es`, {
  maxRedirects: 0,
});
const loc = gres.headers()["location"] ?? "";
check(
  "google sin secretos vuelve al login",
  gres.status() === 307 && loc.endsWith("/es/login"),
  `${gres.status()} → ${loc}`,
);
await api.dispose();

// ── 3) Ceremonia passkey ────────────────────────────────────
const stamp = Date.now();
const email = `test-pk-${stamp}@example.com`;
await page.goto(`${origin}/es/signup`, { waitUntil: "networkidle", timeout: 60000 });
await page.locator("#name").fill("Test Passkey");
await page.locator("#email").fill(email);
await page.locator("#password").fill("testpass123");
await page.getByRole("button", { name: /crear cuenta/i }).click();
await page.waitForURL("**/es/account", { timeout: 30000 });
check("signup crea cuenta y entra", page.url().includes("/es/account"), page.url());

const hasSection = await page.getByText("Passkeys", { exact: true }).count();
check("sección passkeys en cuenta", hasSection > 0);

// Autenticador virtual (huella/Face ID simulados, siempre consiente).
const cdp = await page.context().newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: {
    protocol: "ctap2",
    transport: "usb",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserConsenting: true,
    isUserVerified: true,
  },
});

const registered = await page.evaluate(async () => {
  const b64urlToBuf = (s) => {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  };
  const bufToB64url = (buf) => {
    const b = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  try {
    const opts = await (await fetch("/api/webauthn/register/options", { method: "POST" })).json();
    if (opts.error) return { error: `options:${opts.error}` };
    const cred = await navigator.credentials.create({
      publicKey: {
        ...opts,
        challenge: b64urlToBuf(opts.challenge),
        user: { ...opts.user, id: b64urlToBuf(opts.user.id) },
        excludeCredentials: (opts.excludeCredentials || []).map((c) => ({ ...c, id: b64urlToBuf(c.id) })),
      },
    });
    const regJson = {
      id: cred.id,
      rawId: bufToB64url(cred.rawId),
      type: cred.type,
      response: {
        clientDataJSON: bufToB64url(cred.response.clientDataJSON),
        attestationObject: bufToB64url(cred.response.attestationObject),
        transports: cred.response.getTransports ? cred.response.getTransports() : [],
      },
    };
    const ver = await (
      await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: regJson, deviceName: "Test Auth" }),
      })
    ).json();
    return ver;
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
});
check("passkey registrado", registered?.ok === true, JSON.stringify(registered).slice(0, 120));
await page.reload({ waitUntil: "networkidle" });
await page.screenshot({ path: join(outDir, "01-account-passkey.png") });
const listed = await page.getByText("Test Auth").count();
check("passkey listado en cuenta", listed > 0);

// Cierra sesión y entra solo con el passkey.
await page.getByRole("button", { name: /cerrar sesión/i }).click();
await page.waitForURL("**/es/login", { timeout: 30000 });
const loggedIn = await page.evaluate(async (userEmail) => {
  const b64urlToBuf = (s) => {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  };
  const bufToB64url = (buf) => {
    const b = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  try {
    const opts = await (
      await fetch("/api/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      })
    ).json();
    if (opts.error) return { error: `options:${opts.error}` };
    const cred = await navigator.credentials.get({
      publicKey: {
        ...opts,
        challenge: b64urlToBuf(opts.challenge),
        allowCredentials: (opts.allowCredentials || []).map((c) => ({ ...c, id: b64urlToBuf(c.id) })),
      },
    });
    const authJson = {
      id: cred.id,
      rawId: bufToB64url(cred.rawId),
      type: cred.type,
      response: {
        clientDataJSON: bufToB64url(cred.response.clientDataJSON),
        authenticatorData: bufToB64url(cred.response.authenticatorData),
        signature: bufToB64url(cred.response.signature),
        userHandle: cred.response.userHandle ? bufToB64url(cred.response.userHandle) : null,
      },
    };
    return await (
      await fetch("/api/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, credential: authJson, locale: "es" }),
      })
    ).json();
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
}, email);
check("entrada solo con passkey", loggedIn?.ok === true, JSON.stringify(loggedIn).slice(0, 120));
if (loggedIn?.redirect) {
  await page.goto(`${origin}${loggedIn.redirect}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: join(outDir, "02-account-logged.png") });
  const who = (await page.textContent("body")) ?? "";
  check("sesión activa en /account", who.includes(email), page.url());
}

check("sin pageerrors", pageErrors.length === 0, pageErrors[0] ?? "");
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK · PNG en ${outDir}`);
writeFileSync(join(outDir, "report.json"), JSON.stringify({ origin, email, results }, null, 2));
if (failed.length > 0) process.exitCode = 1;
