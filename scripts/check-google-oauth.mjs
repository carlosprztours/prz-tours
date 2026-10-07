/**
 * Comprueba el flujo de Google OAuth sin navegador.
 *
 * Uso:  node scripts/check-google-oauth.mjs [origen]
 *
 * Sigue la redirección de /api/auth/google y comprueba:
 *   1. que el redirect_uri que genera el código coincide con el que hay que
 *      registrar en Google Cloud,
 *   2. que el client_id es el esperado,
 *   3. que Google NO responde redirect_uri_mismatch (ese era el bug).
 *
 * Usa el mismo agente de usuario en escritorio que las pruebas, porque
 * Google a veces da error distinto a móviles.
 */
const origin = (process.argv[2] ?? "https://perez-tours.com").replace(/\/$/, "");

const res = await fetch(`${origin}/api/auth/google?locale=es`, {
  redirect: "manual",
  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
});

const location = res.headers.get("location") ?? "";
console.log(`estado: ${res.status}`);
if (!location) {
  console.log("no redirige a Google:", location);
  process.exit(1);
}

const url = new URL(location);
const params = url.searchParams;

const redirectUri = params.get("redirect_uri") ?? "";
const clientId = params.get("client_id") ?? "";
const scope = params.get("scope") ?? "";

console.log(`host:         ${url.host}`);
console.log(`redirect_uri: ${redirectUri}`);
console.log(`client_id:    ${clientId}`);
console.log(`scope:        ${scope}\n`);

// Lo que hay que tener en Google Cloud.
const expected = [
  "https://perez-tours.com/api/auth/google/callback",
  "https://www.perez-tours.com/api/auth/google/callback",
  "https://prz-tours.carlosprz-tours.workers.dev/api/auth/google/callback",
];

console.log("URI que hay que tener autorizada:");
for (const uri of expected) {
  console.log(`  ${uri}`);
}
console.log();

// 1) redirect_uri con el formato correcto.
let ok = true;
if (!/^https:\/\/[a-z0-9.-]+\/api\/auth\/google\/callback$/.test(redirectUri)) {
  console.log("FALLO  el redirect_uri no tiene el formato esperado");
  ok = false;
} else {
  console.log("OK    formato del redirect_uri correcto");
}

// 2) Sin localhost ni workers.dev colgando de la URL principal.
if (redirectUri.includes("localhost")) {
  console.log("FALLO  apunta a localhost");
  ok = false;
} else {
  console.log("OK    no apunta a localhost");
}

// 3) Google acepta el client_id: si el alta fuera incorrecta, el propio
//    endpoint de Google lo diría al seguir la redirección.
const consent = await fetch(location, {
  redirect: "manual",
  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
});
const consentLocation = consent.headers.get("location") ?? "";

let mismatch = false;
if (consentLocation.includes("google.com")) {
  const next = new URL(consentLocation);
  mismatch =
    next.pathname.includes("/signin/oauth/error") ||
    (next.searchParams.get("error") ?? "") === "redirect_uri_mismatch";
}

if (mismatch) {
  console.log(
    `\nFALLO  Google responde redirect_uri_mismatch para ${redirectUri}`,
  );
  console.log("       Revisa que esa URI exacta esté en Google Cloud.");
  ok = false;
} else if (consent.status === 200 || consent.status === 302) {
  console.log(`\nOK    Google acepta la petición (HTTP ${consent.status})`);
} else {
  console.log(
    `\nAVISO  Google respondió HTTP ${consent.status}; revisa a mano`,
  );
}

process.exit(ok ? 0 : 1);