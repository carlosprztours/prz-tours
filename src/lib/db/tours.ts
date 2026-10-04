/**
 * Consultas públicas de tours.
 *
 * Todas reciben el `locale` y devuelven el tour con su traducción. Si un tour
 * no tiene traducción en el idioma pedido, se usa la del otro idioma y se
 * marca `fallbackTranslation` para que la UI pueda avisarlo (mejor mostrar
 * algo que un 404).
 */
import "server-only";

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

const OTHER_LOCALE: Record<Locale, Locale> = { es: "en", en: "es" };

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

  const [translations, images, items] = await Promise.all([
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
  ]);

  const byTour = new Map<number, { tr: TourTranslation[]; im: TourImage[]; it: TourListItem[] }>();
  for (const t of rows) byTour.set(t.id, { tr: [], im: [], it: [] });
  for (const tr of translations) byTour.get(tr.tour_id)?.tr.push(tr);
  for (const im of images) byTour.get(im.tour_id)?.im.push(im);
  for (const it of items) byTour.get(it.tour_id)?.it.push(it);

  const out: TourWithContent[] = [];
  for (const tour of rows) {
    const parts = byTour.get(tour.id);
    if (!parts) continue;
    const own = parts.tr.find((t) => t.locale === locale) ?? null;
    let active = own;
    let fallback: TourTranslation | null = null;
    if (!active) {
      fallback = parts.tr.find((t) => t.locale === OTHER_LOCALE[locale]) ?? null;
      active = fallback;
    }
    if (!active) continue;

    const lists: Record<TourListSection, TourListItem[]> = {
      included: [],
      excluded: [],
      bring: [],
    };
    for (const item of parts.it) {
      if (item.locale === active.locale) lists[item.section].push(item);
    }

    out.push({
      ...tour,
      translation: active,
      fallbackTranslation: own ? null : fallback,
      images: parts.im,
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
 * Items mínimos para la navegación (footer). Una sola query ligera en vez
 * del tour completo: el layout la ejecuta en TODAS las páginas.
 */
export async function listTourNavItems(
  locale: Locale,
): Promise<{ slug: string; title: string }[]> {
  const rows = await query<{ slug: string; title: string | null }>(
    `SELECT t.slug AS slug,
            COALESCE(
              MAX(CASE WHEN tr.locale = ? THEN tr.title END),
              MAX(tr.title)
            ) AS title
     FROM tours t
     LEFT JOIN tour_translations tr ON tr.tour_id = t.id
     WHERE t.is_published = 1
     GROUP BY t.id
     ORDER BY t.sort_order ASC, t.id ASC
     LIMIT 5`,
    locale,
  );
  return rows.map((r) => ({ slug: r.slug, title: r.title ?? r.slug }));
}
