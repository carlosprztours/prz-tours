/*
 * Barrido de pruebas del sitio (solo lectura, no crea datos).
 * Comprueba estado HTTP + marcadores de contenido en cada ruta pública.
 *
 *   node scripts/_sweep.mjs [base]
 *   base por defecto: http://localhost:3000
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

const cases = [
  // [ruta, estado esperado, marcadores que deben existir]
  ["/", 307, []],
  ["/en", 200, ["Unforgettable adventures", "Featured tours", "WHATSAPP", "My booking"]],
  ["/es", 200, ["Aventuras inolvidables", "Mi reserva"]],
  ["/en/tours", 200, ["Our tours", "Damajagua", "Paradise Island"]],
  ["/en/tours?categoria=water", 200, ["Damajagua", "Sosúa"]],
  ["/en/tours/damajagua-waterfalls", 200, ["Damajagua Waterfalls Adventure", "$60", "Request booking", "TouristTrip", "What"]],
  ["/en/tours/atv-adventure", 200, ["ATV Adventure Ride"]],
  ["/en/tours/puerto-plata-city-tour", 200, ["City Tour"]],
  ["/en/tours/monkey-jungle", 200, ["Monkey Jungle"]],
  ["/en/tours/dune-buggy", 200, ["Dune Buggy"]],
  ["/en/tours/sosua-snorkeling", 200, ["Sosúa Snorkeling"]],
  ["/en/tours/paradise-island", 200, ["Paradise Island"]],
  ["/es/tours/damajagua-waterfalls", 200, ["Cascadas de Damajagua"]],
  ["/en/tours/no-existe", 404, []],
  ["/en/transfers", 200, ["Airport transfers", "Santiago", "$100"]],
  ["/en/about", 200, ["About Perez Tours", "Our mission"]],
  ["/en/contact", 200, ["Get in touch", "Send us a message"]],
  ["/en/book", 200, ["Book now"]],
  ["/en/book?type=transfer", 200, ["Airport transfers"]],
  ["/en/track", 200, ["Track your booking"]],
  ["/en/login", 200, ["Sign in"]],
  ["/en/signup", 200, ["Create your account"]],
  ["/en/account", 307, []],
  ["/en/admin", 307, []],
  ["/en/admin/bookings", 307, []],
  ["/sitemap.xml", 200, ["damajagua-waterfalls", "/en/tours"]],
  ["/robots.txt", 200, ["sitemap"]],
];

let pass = 0;
let fail = 0;
const failures = [];

for (const [path, wantStatus, markers] of cases) {
  const url = BASE + path;
  let res;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (e) {
    fail++;
    failures.push(`${path} -> FETCH ERROR ${e.cause ?? e.message}`);
    continue;
  }
  const body = res.status === 200 ? await res.text() : "";
  const bodyWa = body.replace("wa.me", "WHATSAPP");
  const problems = [];
  if (res.status !== wantStatus) problems.push(`status ${res.status} (esperado ${wantStatus})`);
  for (const m of markers) {
    if (!bodyWa.includes(m)) problems.push(`falta "${m}"`);
  }
  if (problems.length === 0) {
    pass++;
    console.log(`OK   ${path}`);
  } else {
    fail++;
    failures.push(`${path} -> ${problems.join("; ")}`);
    console.log(`FALLO ${path} -> ${problems.join("; ")}`);
  }
}

console.log(`\n${pass} OK, ${fail} fallos de ${cases.length}`);
if (failures.length) {
  console.log("FALLOS:");
  for (const f of failures) console.log("  -", f);
  process.exit(1);
}
