import "server-only";

import { query, queryOne } from "@/lib/db/client";
import { editorialHash } from "@/lib/db/editorial-cache";
import { translateEditorialText } from "./content-translation";

// Source rows are read on each tick. An old cache key cannot schedule a
// translation after the source is edited or deleted.
const sources = [
  `SELECT id, label_es AS a, NULL AS b, NULL AS c, NULL AS d, NULL AS e
   FROM tour_categories WHERE is_active = 1 AND trim(coalesce(label_en, '')) = ''`,
  `SELECT es.article_id AS id, es.title AS a, es.excerpt AS b, es.body AS c,
          es.seo_title AS d, es.seo_description AS e
   FROM article_translations es JOIN articles article ON article.id = es.article_id
   WHERE es.locale = 'es' AND article.is_published = 1 AND NOT EXISTS (
     SELECT 1 FROM article_translations en WHERE en.article_id = es.article_id
       AND en.locale = 'en' AND trim(en.title) != ''
   )`,
  `SELECT id, CASE WHEN trim(coalesce(question_en, '')) = '' THEN question_es END AS a,
          CASE WHEN trim(coalesce(answer_en, '')) = '' THEN answer_es END AS b,
          NULL AS c, NULL AS d, NULL AS e FROM faqs WHERE is_published = 1`,
  `SELECT id * 2 AS id, alt AS a, caption AS b, NULL AS c, NULL AS d, NULL AS e FROM gallery_images WHERE is_published = 1
   UNION ALL
   SELECT id * 2 + 1 AS id, title AS a, caption AS b, NULL AS c, NULL AS d, NULL AS e FROM gallery_videos WHERE is_published = 1`,
  `SELECT id, price_note AS a, NULL AS b, NULL AS c, NULL AS d, NULL AS e FROM transfer_routes WHERE is_published = 1`,
] as const;

export async function recoverEditorialField(module: number, turn: number) {
  const source = sources[module];
  if (!source) return;
  const row = await queryOne<{ a: string | null; b: string | null; c: string | null; d: string | null; e: string | null }>(
    `WITH source AS (${source}), ranked AS (
       SELECT *, row_number() OVER (ORDER BY id) AS ordinal, count(*) OVER () AS total FROM source
     )
     SELECT a,b,c,d,e FROM ranked WHERE ordinal = (? % total) + 1`,
    turn,
  );
  if (!row) return;

  const fields = [...new Set(Object.values(row).map((value) => value?.trim() ?? ""))]
    .filter((value) => value.length > 0 && value.length <= 800);
  if (!fields.length) return;
  const hashes = await Promise.all(fields.map((value) => editorialHash(value, true)));
  const pending = await query<{ source_hash: string }>(
    `SELECT source_hash FROM content_translation_cache
     WHERE status IN ('pending', 'error') AND attempts < 3 AND retry_after <= ?
       AND source_hash IN (${hashes.map(() => "?").join(",")})`,
    Date.now(), ...hashes,
  );
  const next = hashes.findIndex((hash) => pending.some((item) => item.source_hash === hash));
  if (next >= 0) await translateEditorialText(fields[next]);
}
