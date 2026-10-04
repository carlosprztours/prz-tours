/*
 * Genera UPDATEs para llevar a D1 los textos corregidos del seed.
 *
 *   node scripts/sync-content.mjs            (imprime el SQL)
 *   node scripts/sync-content.mjs --local    (lo aplica en local)
 *   node scripts/sync-content.mjs --remote   (lo aplica en remoto)
 *
 * Solo toca: tour_translations, testimonials y settings (claves del seed).
 * Nunca toca bookings, users ni sessions.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { settings, testimonials, tours } from "./seed-data.mjs";
import { d1ExecuteFile } from "./lib/run-wrangler.mjs";

const q = (v) =>
  v === null || v === undefined
    ? "NULL"
    : `'${String(v).replace(/'/g, "''")}'`;

const out = [];

for (const tour of tours) {
  const rowId = `(SELECT id FROM tours WHERE slug = ${q(tour.slug)})`;
  for (const locale of ["es", "en"]) {
    const t = tour.translations[locale];
    out.push(
      `UPDATE tour_translations SET title = ${q(t.title)}, summary = ${q(t.summary)}, description = ${q(t.description)}, seo_title = ${q(t.seoTitle ?? null)}, seo_description = ${q(t.seoDescription ?? null)} WHERE tour_id = ${rowId} AND locale = ${q(locale)};`,
    );
  }
}

for (const t of testimonials) {
  out.push(
    `UPDATE testimonials SET author_name = ${q(t.authorName)}, author_origin = ${q(t.authorOrigin)}, rating = ${t.rating}, text_es = ${q(t.textEs)}, text_en = ${q(t.textEn)}, tour_slug = ${q(t.tourSlug ?? null)} WHERE author_name = ${q(t.authorName)};`,
  );
}

for (const [key, value] of Object.entries(settings)) {
  out.push(
    `INSERT INTO settings (key, value, updated_at) VALUES (${q(key)}, ${q(value)}, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now');`,
  );
}

const sql = out.join("\n");

const mode = process.argv[2];
if (mode !== "--local" && mode !== "--remote") {
  console.log(sql);
  process.exit(0);
}

// Por lotes en archivos temporales (--command tiene límite de longitud).
const CHUNK = 25;
const dir = mkdtempSync(join(tmpdir(), "prz-sync-"));
for (let i = 0; i < out.length; i += CHUNK) {
  const file = join(dir, `sync-${i}.sql`);
  writeFileSync(file, out.slice(i, i + CHUNK).join("\n"), "utf8");
  d1ExecuteFile("prz-tours", mode, file);
}
rmSync(dir, { recursive: true, force: true });
console.log(`✓ Contenido sincronizado (${mode}): ${out.length} sentencias.`);
