import "server-only";

import { readEditorialEnglishBatch } from "./editorial-cache";
import { editorialSnapshot, existingPickupNote, publishReviewedTourEnglish } from "@/lib/tour-editorial-review";
import { query, queryOne } from "./client";
import type {
  Locale,
  Tour,
  TourImage,
  TourListItem,
  TourListSection,
  TourTranslation,
  TourWithContent,
} from "@/types";


/** Columnas base de `tours` (para no repetir el SELECT). */
const TOUR_COLUMNS = `
  id, slug, price, price_unit, duration_minutes, category, difficulty,
  age_min, pickup_note, max_group, cruise_friendly, deposit_percent,
  is_featured, is_published, sort_order,
  created_at, updated_at
`;

async function withContents(
  rows: Tour[],
  locale: Locale,
): Promise<TourWithContent[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((t) => t.id);
  const placeholders = ids.map(() => "?").join(",");

  const [translations, images, items, editorial] = await Promise.all([
    query<TourTranslation>(
      `SELECT id, tour_id, locale, title, summary, description,
              seo_title, seo_description
       FROM tour_translations
       WHERE tour_id IN (${placeholders})`,
      ...ids,
    ),
    query<TourImage>(
      `SELECT id, tour_id, url, alt, sort_order
       FROM tour_images
       WHERE tour_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`,
      ...ids,
    ),
    query<TourListItem>(
      `SELECT id, tour_id, locale, section, label, sort_order
       FROM tour_list_items
       WHERE tour_id IN (${placeholders})
       ORDER BY section ASC, sort_order ASC, id ASC`,
      ...ids,
    ),
    locale === "en" ? query<{ tour_id: number; source: string; english: string; approvals: string }>(
      `SELECT tour_id, source, english, approvals FROM tour_editorial_translation
       WHERE status = 'translated' AND tour_id IN (${placeholders})`, ...ids,
    ) : [],
  ]);
  const generated = new Map(editorial.map((row) => [row.tour_id, row]));

  const byTour = new Map<number, { tr: TourTranslation[]; im: TourImage[]; it: TourListItem[] }>();
  for (const t of rows) byTour.set(t.id, { tr: [], im: [], it: [] });
  for (const tr of translations) byTour.get(tr.tour_id)?.tr.push(tr);
  for (const im of images) byTour.get(im.tour_id)?.im.push(im);
  for (const it of items) byTour.get(it.tour_id)?.it.push(it);

  const out: TourWithContent[] = [];
  for (const tour of rows) {
    const parts = byTour.get(tour.id);
    if (!parts) continue;
    let active = parts.tr.find((translation) => translation.locale === locale);
    const stored = generated.get(tour.id);
    let pickupNote = existingPickupNote(locale, locale === "en" && Boolean(active), tour.pickup_note);
    const lists: Record<TourListSection, TourListItem[]> = { included: [], excluded: [], bring: [] };
    for (const item of parts.it) {
      if (item.locale === (active?.locale ?? locale)) lists[item.section].push(item);
    }
    if (!active && stored) {
      const [title, summary, description, seoTitle, seoDescription, included, excluded, bring, pickup] =
        publishReviewedTourEnglish(
          editorialSnapshot(stored.source), editorialSnapshot(stored.english), editorialSnapshot(stored.approvals),
        );
      active = { id: tour.id, tour_id: tour.id, locale, title, summary, description,
        seo_title: seoTitle || null, seo_description: seoDescription || null };
      pickupNote = pickup || null;
      for (const [section, value] of Object.entries({ included, excluded, bring }) as [TourListSection, string][]) {
        lists[section] = value ? value.split("\n").map((label, index) => ({
          id: index, tour_id: tour.id, locale, section, label, sort_order: index,
        })) : [];
      }
    }
    if (!active?.title.trim()) continue;

    out.push({
      ...tour,
      translation: active,
      pickup_note: pickupNote,
      images: locale === "en" ? parts.im.map((image) => ({ ...image, alt: "" })) : parts.im,
      lists,
    });
  }
  return out;
}

/** Todos los tours publicados, ordenados para el catálogo (4 queries). */
export async function listPublishedTours(
  locale: Locale,
): Promise<TourWithContent[]> {
  const rows = await query<Tour>(
    `SELECT ${TOUR_COLUMNS} FROM tours
     WHERE is_published = 1
     ORDER BY sort_order ASC, id ASC`,
  );
  return withContents(rows, locale);
}

/** Tours marcados como destacados, para la home (4 queries). */
export async function listFeaturedTours(
  locale: Locale,
  limit = 6,
): Promise<TourWithContent[]> {
  const rows = await query<Tour>(
    `SELECT ${TOUR_COLUMNS} FROM tours
     WHERE is_published = 1 AND is_featured = 1
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    limit,
  );
  return withContents(rows, locale);
}

/** Un tour por slug (para la página de detalle). */
export async function getTourBySlug(
  slug: string,
  locale: Locale,
): Promise<TourWithContent | null> {
  const row = await queryOne<Tour>(
    `SELECT ${TOUR_COLUMNS} FROM tours WHERE slug = ? AND is_published = 1`,
    slug,
  );
  if (!row) return null;
  const full = await withContents([row], locale);
  return full[0] ?? null;
}

/** Tours relacionados (misma categoría, excluyendo el actual). */
export async function listRelatedTours(
  tourId: number,
  category: string,
  locale: Locale,
  limit = 3,
): Promise<TourWithContent[]> {
  const rows = await query<Tour>(
    `SELECT ${TOUR_COLUMNS} FROM tours
     WHERE is_published = 1 AND id != ? AND category = ?
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    tourId,
    category,
    limit,
  );
  // Si la categoría no da suficientes, rellena con otros tours.
  if (rows.length < limit) {
    const extra = await query<Tour>(
      `SELECT ${TOUR_COLUMNS} FROM tours
       WHERE is_published = 1 AND id != ? AND category != ?
       ORDER BY sort_order ASC, id ASC
       LIMIT ?`,
      tourId,
      category,
      limit - rows.length,
    );
    rows.push(...extra);
  }
  return withContents(rows, locale);
}

/** Todos los slugs publicados (para el sitemap y generateStaticParams). */
export async function listPublishedTourSlugs(): Promise<string[]> {
  const rows = await query<Pick<Tour, "slug">>(
    `SELECT slug FROM tours WHERE is_published = 1 ORDER BY sort_order ASC`,
  );
  return rows.map((r) => r.slug);
}

/**
 * Categorías activas para los filtros del catálogo y las etiquetas de las
 * tarjetas. Vienen de `tour_categories` (migración 0009), así que el admin
 * puede crear las que quiera sin tocar código.
 */
export async function listActiveCategories(
  locale: Locale,
): Promise<{ slug: string; label: string; icon: string }[]> {
  const rows = await query<{ slug: string; label_es: string; label_en: string; icon: string }>(
    `SELECT slug, label_es, label_en, icon
     FROM tour_categories
     WHERE is_active = 1
     ORDER BY sort_order ASC, label_es ASC`,
  );
  const english = locale === "en" ? await readEditorialEnglishBatch(rows.filter((row) => !row.label_en.trim()).map((row) => row.label_es)) : null;
  const categories = rows.map((row) => ({
    slug: row.slug,
    label: locale === "es" ? row.label_es : (english?.(row.label_es, row.label_en) ?? ""),
    icon: row.icon,
  }));
  return categories.filter((category) => category.label.trim());

}

/**
 * Items mínimos para la navegación (footer). Una sola query ligera en vez
 * del tour completo: el layout la ejecuta en TODAS las páginas.
 */
export async function listTourNavItems(
  locale: Locale,
): Promise<{ slug: string; title: string }[]> {
  const rows = await query<{ slug: string; title: string }>(
    `WITH localized AS (
       SELECT t.slug, t.sort_order, t.id,
              COALESCE(NULLIF(trim(tr.title), ''),
                       CASE WHEN ? = 'en' THEN NULLIF(trim(json_extract(e.english, '$[0]')), '') END) AS title
       FROM tours t
       LEFT JOIN tour_translations tr ON tr.tour_id = t.id AND tr.locale = ?
       LEFT JOIN tour_editorial_translation e ON e.tour_id = t.id AND e.status = 'translated'
       WHERE t.is_published = 1
     )
     SELECT slug, title FROM localized WHERE title IS NOT NULL
     ORDER BY sort_order ASC, id ASC LIMIT 5`,
    locale, locale,
  );
  return rows;
}
