/**
 * Restaura SOLO el contenido de tours que falte, sin recrear los tours.
 *
 * Uso:
 *   node scripts/restore-tour-content.mjs            (local)
 *   node scripts/restore-tour-content.mjs --remote
 *
 * Por qué existe: `scripts/seed.mjs` hace `DELETE FROM tours` y vuelve a
 * insertar, lo que cambia los `tour_id` y deja las reservas apuntando a tours
 * inexistentes. Este script, en cambio, busca cada tour por `slug` y rellena
 * solo `tour_translations`, `tour_images` y `tour_list_items` si están vacíos.
 * No toca `tours` ni ninguna reserva.
 *
 * Las sentencias van en un .sql temporal (igual que seed.mjs) porque el SQL
 * multilínea no sobrevive a `--command` a través del shell de Windows.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { tours } from "./seed-data.mjs";

const remote = process.argv.includes("--remote");
const cwd = "C:\\Users\\VIP\\Documents\\prz\\prz-web";
const flag = remote ? "--remote" : "--local";

const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

function run(args, { capture = false } = {}) {
  const prefix = remote
    ? "node scripts/with-secrets.mjs -- npx wrangler"
    : "npx wrangler";
  return execSync(`${prefix} ${args}`, {
    cwd,
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
}

/** Ejecuta un archivo .sql con sentencias (usa el binding $1..$n). */
function runFile(statements) {
  const file = join(tmpdir(), `prz-restore-${Date.now()}.sql`);
  writeFileSync(file, statements.join("\n"), "utf8");
  run(`d1 execute prz-tours ${flag} --file="${file}"`);
}

function query(sql) {
  const out = run(`d1 execute prz-tours ${flag} --command "${sql}" --json`, {
    capture: true,
  });
  const start = out.indexOf("[");
  const end = out.lastIndexOf("]");
  return JSON.parse(out.slice(start, end + 1))[0]?.results ?? [];
}

const existing = new Map(
  query("SELECT id, slug FROM tours").map((r) => [r.slug, r.id]),
);
console.log(
  `${remote ? "remoto" : "local"}: ${existing.size} tours en la base, ${tours.length} en seed-data.mjs`,
);

const all = [];
let restored = 0;
let skipped = 0;
const missing = [];

for (const tour of tours) {
  const tourId = existing.get(tour.slug);
  if (!tourId) {
    missing.push(tour.slug);
    continue;
  }

  const have = query(
    `SELECT COUNT(*) AS n FROM tour_translations WHERE tour_id = ${tourId}`,
  )[0]?.n;
  if (have > 0) {
    skipped += 1;
    continue;
  }

  for (const locale of ["es", "en"]) {
    const t = tour.translations[locale];
    if (!t) continue;
    all.push(
      `INSERT INTO tour_translations (tour_id, locale, title, summary, description, seo_title, seo_description)
       VALUES (${tourId}, ${q(locale)}, ${q(t.title)}, ${q(t.summary)}, ${q(t.description)}, ${q(t.seoTitle ?? null)}, ${q(t.seoDescription ?? null)});`,
    );
  }
  (tour.images ?? []).forEach((img, i) => {
    all.push(
      `INSERT INTO tour_images (tour_id, url, alt, sort_order) VALUES (${tourId}, ${q(img.url)}, ${q(img.alt)}, ${i});`,
    );
  });
  for (const [section, byLocale] of [
    ["included", tour.included],
    ["excluded", tour.excluded],
    ["bring", tour.bring],
  ]) {
    for (const locale of ["es", "en"]) {
      (byLocale?.[locale] ?? []).forEach((label, i) => {
        all.push(
          `INSERT INTO tour_list_items (tour_id, locale, section, label, sort_order)
           VALUES (${tourId}, ${q(locale)}, ${q(section)}, ${q(label)}, ${i});`,
        );
      });
    }
  }
  restored += 1;
  console.log(`  + ${tour.slug}`);
}

if (all.length > 0) {
  runFile(all);
  console.log(`\n${all.length} sentencias aplicadas.`);
}
console.log(`Restaurados: ${restored} · ya estaban completos: ${skipped}`);
if (missing.length > 0) {
  console.log(`Sin tour en la base (no se tocó nada): ${missing.join(", ")}`);
}