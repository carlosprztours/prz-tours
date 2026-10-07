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
import { settings, testimonials, tours, articles, faqs } from "./seed-data.mjs";
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

for (const f of faqs) {
  // Sin UNIQUE en faqs: inserta solo si la pregunta no existe.
  out.push(
    `INSERT INTO faqs (question_es, answer_es, question_en, answer_en, sort_order, is_published)
     SELECT ${q(f.questionEs)}, ${q(f.answerEs)}, ${q(f.questionEn)}, ${q(f.answerEn)}, ${f.sortOrder ?? 0}, 1
     WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question_es = ${q(f.questionEs)});`,
  );
}

for (const a of articles) {
  out.push(
    `INSERT INTO articles (slug, cover_url, is_published, sort_order)
     VALUES (${q(a.slug)}, ${q(a.coverUrl ?? null)}, 1, ${a.sortOrder ?? 0})
     ON CONFLICT(slug) DO UPDATE SET cover_url = excluded.cover_url, sort_order = excluded.sort_order;`,
  );
  const rowId = `(SELECT id FROM articles WHERE slug = ${q(a.slug)})`;
  for (const locale of ["es", "en"]) {
    const t = a.translations[locale];
    out.push(
      `INSERT INTO article_translations (article_id, locale, title, excerpt, body, seo_title, seo_description)
       VALUES (${rowId}, ${q(locale)}, ${q(t.title)}, ${q(t.excerpt)}, ${q(t.description)}, ${q(t.seoTitle ?? null)}, ${q(t.seoDescription ?? null)})
       ON CONFLICT(article_id, locale) DO UPDATE SET title = excluded.title, excerpt = excluded.excerpt, body = excluded.body, seo_title = excluded.seo_title, seo_description = excluded.seo_description;`,
    );
  }
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
  d1ExecuteFile("prz-tours-new", mode, file);
}
rmSync(dir, { recursive: true, force: true });
console.log(`✓ Contenido sincronizado (${mode}): ${out.length} sentencias.`);
