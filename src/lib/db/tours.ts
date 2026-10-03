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
  age_min, pickup_note, is_featured, is_published, sort_order,
  created_at, updated_at
`;

async function loadImages(tourId: number): Promise<TourImage[]> {
  return query<TourImage>(
    `SELECT id, tour_id, url, alt, sort_order
     FROM tour_images
     WHERE tour_id = ?
     ORDER BY sort_order ASC, id ASC`,
    tourId,
  );
}

async function loadLists(
  tourId: number,
  locale: Locale,
): Promise<Record<TourListSection, TourListItem[]>> {
  const rows = await query<TourListItem>(
    `SELECT id, tour_id, locale, section, label, sort_order
     FROM tour_list_items
     WHERE tour_id = ? AND locale = ?
     ORDER BY section ASC, sort_order ASC, id ASC`,
    tourId,
    locale,
  );
  const lists: Record<TourListSection, TourListItem[]> = {
    included: [],
    excluded: [],
    bring: [],
  };
  for (const row of rows) lists[row.section].push(row);
  return lists;
}

async function withContent(
  tour: Tour,
  locale: Locale,
): Promise<TourWithContent | null> {
  const translation = await queryOne<TourTranslation>(
    `SELECT id, tour_id, locale, title, summary, description,
            seo_title, seo_description
     FROM tour_translations
     WHERE tour_id = ? AND locale = ?`,
    tour.id,
    locale,
  );

  let fallback: TourTranslation | null = null;
  let active = translation;
  if (!active) {
    fallback = await queryOne<TourTranslation>(
      `SELECT id, tour_id, locale, title, summary, description,
              seo_title, seo_description
       FROM tour_translations
       WHERE tour_id = ? AND locale = ?`,
      tour.id,
      OTHER_LOCALE[locale],
    );
    active = fallback;
  }
  if (!active) return null;

  const [images, lists] = await Promise.all([
    loadImages(tour.id),
    loadLists(tour.id, active.locale as Locale),
  ]);

  return {
    ...tour,
    translation: active,
    fallbackTranslation: translation ? null : fallback,
    images,
    lists,
  };
}

/** Todos los tours publicados, ordenados para el catálogo. */
export async function listPublishedTours(
  locale: Locale,
): Promise<TourWithContent[]> {
  const rows = await query<Tour>(
    `SELECT ${TOUR_COLUMNS} FROM tours
     WHERE is_published = 1
     ORDER BY sort_order ASC, id ASC`,
  );
  const out: TourWithContent[] = [];
  for (const row of rows) {
    const full = await withContent(row, locale);
    if (full) out.push(full);
  }
  return out;
}

/** Tours marcados como destacados (para la home). */
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
  const out: TourWithContent[] = [];
  for (const row of rows) {
    const full = await withContent(row, locale);
    if (full) out.push(full);
  }
  return out;
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
  return withContent(row, locale);
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
  const out: TourWithContent[] = [];
  for (const row of rows) {
    const full = await withContent(row, locale);
    if (full) out.push(full);
  }
  return out;
}

/** Todos los slugs publicados (para el sitemap y generateStaticParams). */
export async function listPublishedTourSlugs(): Promise<string[]> {
  const rows = await query<Pick<Tour, "slug">>(
    `SELECT slug FROM tours WHERE is_published = 1 ORDER BY sort_order ASC`,
  );
  return rows.map((r) => r.slug);
}
