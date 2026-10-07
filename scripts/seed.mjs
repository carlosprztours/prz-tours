/*
 * Seed de la base de datos de Perez Tours.
 *
 *   node scripts/seed.mjs --local    (base emulada de wrangler, por defecto)
 *   node scripts/seed.mjs --remote   (requiere login de wrangler)
 *
 * Es idempotente en CONTENIDO (tours, traslados, testimonios, galería,
 * ajustes, mensajes de ejemplo), pero OJO: por defecto NO toca `users`,
 * `sessions`, `bookings` ni `booking_events` para no borrar cuentas ni
 * reservas reales. Pasa `--include-bookings` para vaciarlas también
 * (solo desarrollo, con backup previo).
 */
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { articles, faqs, tours, transferRoutes, testimonials, gallery, settings } from "./seed-data.mjs";
import { d1ExecuteFile } from "./lib/run-wrangler.mjs";

const remote = process.argv.includes("--remote");
const flag = remote ? "--remote" : "--local";
const DB = "prz-tours";

/** Escapa un valor para una sentencia SQL de SQLite. */
const q = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "0";
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${String(v).replace(/'/g, "''")}'`;
};

const statements = [];
const sql = (s) => statements.push(s);

// ── 1. Limpiar contenido de demostración ────────────────────────────────────
// Nunca reservas, eventos, mensajes ni cuentas sin flag explícito.
const includeBookings = process.argv.includes("--include-bookings");
const wipeTables = [
  "tour_list_items",
  "tour_images",
  "tour_translations",
  "tours",
  "transfer_routes",
  "testimonials",
  "gallery_images",
  "faqs",
  "article_translations",
  "articles",
  "messages",
  "settings",
];
if (includeBookings) {
  wipeTables.push("booking_events", "bookings");
  console.log("⚠  --include-bookings: también se vacían reservas y eventos.");
}
for (const t of wipeTables) {
  sql(`DELETE FROM ${t};`);
}

// ── 2. Ajustes del sitio ────────────────────────────────────────────────────
for (const [key, value] of Object.entries(settings)) {
  sql(`INSERT INTO settings (key, value) VALUES (${q(key)}, ${q(value)});`);
}

// ── 3. Tours ────────────────────────────────────────────────────────────────
let nImages = 0;
let nItems = 0;

for (const tour of tours) {
  sql(`
    INSERT INTO tours
      (slug, price, price_unit, duration_minutes, category, difficulty,
       age_min, max_group, cruise_friendly, deposit_percent,
       pickup_note, is_featured, is_published, sort_order)
    VALUES
      (${q(tour.slug)}, ${tour.price}, ${q(tour.priceUnit)}, ${tour.durationMinutes},
       ${q(tour.category)}, ${q(tour.difficulty)}, ${tour.ageMin ?? "NULL"},
       ${tour.maxGroup ?? 20}, ${tour.cruiseFriendly ?? 0}, ${tour.depositPercent ?? 0},
       ${q(tour.pickupNote ?? null)}, ${tour.isFeatured}, 1, ${tour.sortOrder});
  `);

  const rowId = `(
    SELECT id FROM tours WHERE slug = ${q(tour.slug)}
  )`;

  for (const locale of ["es", "en"]) {
    const t = tour.translations[locale];
    sql(`
      INSERT INTO tour_translations
        (tour_id, locale, title, summary, description, seo_title, seo_description)
      VALUES
        (${rowId}, ${q(locale)}, ${q(t.title)}, ${q(t.summary)}, ${q(t.description)},
         ${q(t.seoTitle ?? null)}, ${q(t.seoDescription ?? null)});
    `);
  }

  tour.images.forEach((img, i) => {
    sql(`
      INSERT INTO tour_images (tour_id, url, alt, sort_order)
      VALUES (${rowId}, ${q(img.url)}, ${q(img.alt)}, ${i});
    `);
    nImages++;
  });

  for (const [section, byLocale] of [
    ["included", tour.included],
    ["excluded", tour.excluded],
    ["bring", tour.bring],
  ]) {
    for (const locale of ["es", "en"]) {
      (byLocale?.[locale] ?? []).forEach((label, i) => {
        sql(`
          INSERT INTO tour_list_items (tour_id, locale, section, label, sort_order)
          VALUES (${rowId}, ${q(locale)}, ${q(section)}, ${q(label)}, ${i});
        `);
        nItems++;
      });
    }
  }
}

// ── 4. Traslados ────────────────────────────────────────────────────────────
transferRoutes.forEach((r) => {
  sql(`
    INSERT INTO transfer_routes
      (origin_key, origin_label, origin_airport, destination,
       price_1_5, price_6_11, price_note, sort_order, is_published)
    VALUES
      (${q(r.originKey)}, ${q(r.originLabel)}, ${q(r.originAirport ?? null)},
       ${q(r.destination)}, ${r.price15}, ${r.price611}, ${q(r.priceNote ?? null)},
       ${r.sortOrder}, 1);
  `);
});

// ── 5. Testimonios ──────────────────────────────────────────────────────────
testimonials.forEach((t, i) => {
  sql(`
    INSERT INTO testimonials
      (author_name, author_origin, rating, text_es, text_en, tour_slug,
       is_published, sort_order)
    VALUES
      (${q(t.authorName)}, ${q(t.authorOrigin)}, ${t.rating}, ${q(t.textEs)},
       ${q(t.textEn)}, ${q(t.tourSlug ?? null)}, 1, ${i});
  `);
});

// ── 6. Galería ──────────────────────────────────────────────────────────────
gallery.forEach((g, i) => {
  sql(`
    INSERT INTO gallery_images (url, alt, caption, is_published, sort_order)
    VALUES (${q(g.url)}, ${q(g.alt)}, ${q(g.caption ?? null)}, 1, ${i});
  `);
});

// ── 7. FAQs ───────────────────────────────────────────────────────────────
faqs.forEach((f, i) => {
  sql(`
    INSERT INTO faqs
      (question_es, answer_es, question_en, answer_en, sort_order, is_published)
    VALUES
      (${q(f.questionEs)}, ${q(f.answerEs)}, ${q(f.questionEn)}, ${q(f.answerEn)},
       ${f.sortOrder ?? i}, 1);
  `);
});

// ── 8. Artículos ──────────────────────────────────────────────────────────
for (const a of articles) {
  sql(`
    INSERT INTO articles (slug, cover_url, is_published, sort_order)
    VALUES (${q(a.slug)}, ${q(a.coverUrl ?? null)}, 1, ${a.sortOrder ?? 0});
  `);
  const rowId = `(SELECT id FROM articles WHERE slug = ${q(a.slug)})`;
  for (const locale of ["es", "en"]) {
    const t = a.translations[locale];
    sql(`
      INSERT INTO article_translations
        (article_id, locale, title, excerpt, body, seo_title, seo_description)
      VALUES
        (${rowId}, ${q(locale)}, ${q(t.title)}, ${q(t.excerpt)}, ${q(t.description)},
         ${q(t.seoTitle ?? null)}, ${q(t.seoDescription ?? null)});
    `);
  }
}

// ── Ejecutar ────────────────────────────────────────────────────────────────
// Chunking para no exceder el límite de longitud de sentencia de SQLite
const CHUNK = 60;
const chunks = [];
for (let i = 0; i < statements.length; i += CHUNK) {
  chunks.push(statements.slice(i, i + CHUNK).join("\n"));
}

console.log(
  `Ejecutando ${statements.length} sentencias en ${chunks.length} lote(s) (${flag})…`,
);

const workDir = mkdtempSync(join(tmpdir(), "prz-seed-"));
for (const [i, chunk] of chunks.entries()) {
  const file = join(workDir, `seed-chunk-${i}.sql`);
  writeFileSync(file, chunk, "utf8");
  d1ExecuteFile(DB, flag, file);
  process.stdout.write(`  ✓ lote ${i + 1}/${chunks.length}\n`);
}
rmSync(workDir, { recursive: true, force: true });

console.log(`
✓ Seed completado (${flag})

  ${tours.length} tours           · ${nImages} imágenes de tour
  ${transferRoutes.length} traslados      · ${nItems} ítems de listas
  ${testimonials.length} testimonios    · ${gallery.length} fotos de galería
  ${Object.keys(settings).length} ajustes

${remote ? "⚠  Base remota modificada." : "Base local lista. Usa --remote para publicar."}
`);

// Referencia para generar la contraseña del admin
console.log(`random:${randomBytes(8).toString("hex")}`);
