/**
 * Server Actions de tours (staff).
 *
 * El formulario del panel envía todo plano (una textarea por lista, una por
 * imágenes) y aquí se normaliza a las tablas `tours`, `tour_translations`,
 * `tour_images` y `tour_list_items`.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { batch, execute, query, queryOne } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import type {
  Difficulty,
  Locale,
  PriceUnit,
  Tour,
  TourCategory,
  TourImage,
  TourListItem,
  TourTranslation,
} from "@/types";

export type ToursResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  await verifySession(locale);
  return locale;
}

export type AdminTourListItem = Pick<
  Tour,
  | "id"
  | "slug"
  | "price"
  | "price_unit"
  | "is_featured"
  | "is_published"
  | "sort_order"
> & { title_es: string; title_en: string };

/** Lista para el índice del panel (con títulos en ambos idiomas). */
export async function listAdminTours(rawLocale: string): Promise<AdminTourListItem[]> {
  await requireStaff(rawLocale);
  return query<AdminTourListItem>(
    `SELECT t.id, t.slug, t.price, t.price_unit, t.is_featured, t.is_published, t.sort_order,
            MAX(CASE WHEN tr.locale = 'es' THEN tr.title END) AS title_es,
            MAX(CASE WHEN tr.locale = 'en' THEN tr.title END) AS title_en
     FROM tours t
     LEFT JOIN tour_translations tr ON tr.tour_id = t.id
     GROUP BY t.id
     ORDER BY t.sort_order ASC, t.id ASC`,
  );
}

export type AdminTourFull = {
  tour: Tour;
  translations: Record<Locale, TourTranslation | null>;
  images: TourImage[];
  lists: Record<Locale, Record<"included" | "excluded" | "bring", string[]>>;
};

export async function getAdminTour(
  rawLocale: string,
  id: number,
): Promise<AdminTourFull | null> {
  await requireStaff(rawLocale);
  const tour = await queryOne<Tour>(`SELECT * FROM tours WHERE id = ?`, id);
  if (!tour) return null;

  const translations = await query<TourTranslation>(
    `SELECT * FROM tour_translations WHERE tour_id = ?`,
    id,
  );
  const images = await query<TourImage>(
    `SELECT * FROM tour_images WHERE tour_id = ? ORDER BY sort_order ASC, id ASC`,
    id,
  );
  const items = await query<TourListItem>(
    `SELECT * FROM tour_list_items WHERE tour_id = ?
     ORDER BY locale ASC, section ASC, sort_order ASC, id ASC`,
    id,
  );

  const empty = { included: [] as string[], excluded: [] as string[], bring: [] as string[] };
  const lists: AdminTourFull["lists"] = {
    es: { ...empty, included: [], excluded: [], bring: [] },
    en: { ...empty, included: [], excluded: [], bring: [] },
  };
  for (const item of items) {
    lists[item.locale][item.section].push(item.label);
  }

  return {
    tour,
    translations: {
      es: translations.find((t) => t.locale === "es") ?? null,
      en: translations.find((t) => t.locale === "en") ?? null,
    },
    images,
    lists,
  };
}

// ─────────────────────────── Guardado ───────────────────────────

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function num(form: FormData, key: string, fallback: number): number {
  const v = Number(str(form, key));
  return Number.isFinite(v) ? v : fallback;
}

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseBase(form: FormData) {
  const slug = str(form, "slug")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const priceUnit = str(form, "price_unit");
  const category = str(form, "category");
  const difficulty = str(form, "difficulty");
  return {
    slug,
    price: Math.max(0, num(form, "price", 0)),
    price_unit: (["person", "vehicle", "group"].includes(priceUnit) ? priceUnit : "person") as PriceUnit,
    duration_minutes: Math.max(30, Math.round(num(form, "duration_minutes", 240))),
    category: (["water", "adventure", "culture", "wildlife", "beach", "other"].includes(category) ? category : "other") as TourCategory,
    difficulty: (["easy", "moderate", "challenging"].includes(difficulty) ? difficulty : "easy") as Difficulty,
    age_min: str(form, "age_min") === "" ? null : Math.max(0, Math.round(num(form, "age_min", 0))),
    pickup_note: str(form, "pickup_note") || null,
    is_featured: form.get("is_featured") === "on" ? 1 : 0,
    is_published: form.get("is_published") === "on" ? 1 : 0,
    sort_order: Math.round(num(form, "sort_order", 0)),
  };
}

function validateBase(base: ReturnType<typeof parseBase>): string | null {
  if (!base.slug) return "bad-slug";
  return null;
}

export async function createTour(
  rawLocale: string,
  _prev: ToursResult | undefined,
  formData: FormData,
): Promise<ToursResult> {
  const locale = await requireStaff(rawLocale);
  const base = parseBase(formData);
  const error = validateBase(base);
  if (error) return { ok: false, error };

  const exists = await queryOne<{ id: number }>(
    `SELECT id FROM tours WHERE slug = ?`,
    base.slug,
  );
  if (exists) return { ok: false, error: "slug-taken" };

  await writeTour(null, base, formData);
  revalidatePath(`/${locale}/tours`);
  redirect(`/${locale}/admin/tours`);
}

export async function updateTour(
  rawLocale: string,
  id: number,
  _prev: ToursResult | undefined,
  formData: FormData,
): Promise<ToursResult> {
  const locale = await requireStaff(rawLocale);
  const base = parseBase(formData);
  const error = validateBase(base);
  if (error) return { ok: false, error };

  const clash = await queryOne<{ id: number }>(
    `SELECT id FROM tours WHERE slug = ? AND id != ?`,
    base.slug,
    id,
  );
  if (clash) return { ok: false, error: "slug-taken" };

  await writeTour(id, base, formData);
  revalidatePath(`/${locale}/tours`);
  revalidatePath(`/${locale}/admin/tours`);
  return { ok: true };
}

async function writeTour(
  id: number | null,
  base: ReturnType<typeof parseBase>,
  formData: FormData,
): Promise<number> {
  if (id === null) {
    const result = await execute(
      `INSERT INTO tours
         (slug, price, price_unit, duration_minutes, category, difficulty,
          age_min, pickup_note, is_featured, is_published, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      base.slug,
      base.price,
      base.price_unit,
      base.duration_minutes,
      base.category,
      base.difficulty,
      base.age_min,
      base.pickup_note,
      base.is_featured,
      base.is_published,
      base.sort_order,
    );
    id = Number(result.meta.last_row_id);
  } else {
    await execute(
      `UPDATE tours SET slug = ?, price = ?, price_unit = ?, duration_minutes = ?,
         category = ?, difficulty = ?, age_min = ?, pickup_note = ?,
         is_featured = ?, is_published = ?, sort_order = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      base.slug,
      base.price,
      base.price_unit,
      base.duration_minutes,
      base.category,
      base.difficulty,
      base.age_min,
      base.pickup_note,
      base.is_featured,
      base.is_published,
      base.sort_order,
      id,
    );
    // Limpia contenido anterior para reescribirlo.
    await batch([
      { sql: `DELETE FROM tour_translations WHERE tour_id = ?`, params: [id] },
      { sql: `DELETE FROM tour_images WHERE tour_id = ?`, params: [id] },
      { sql: `DELETE FROM tour_list_items WHERE tour_id = ?`, params: [id] },
    ]);
  }

  const statements: { sql: string; params?: unknown[] }[] = [];

  for (const loc of ["es", "en"] as const) {
    const title = str(formData, `title_${loc}`);
    if (!title) continue;
    statements.push({
      sql: `INSERT INTO tour_translations
              (tour_id, locale, title, summary, description, seo_title, seo_description)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        loc,
        title,
        str(formData, `summary_${loc}`),
        str(formData, `description_${loc}`),
        str(formData, `seo_title_${loc}`) || null,
        str(formData, `seo_description_${loc}`) || null,
      ],
    });
  }

  lines(str(formData, "images")).forEach((line, i) => {
    const [url, ...altParts] = line.split("|");
    if (!url.trim()) return;
    statements.push({
      sql: `INSERT INTO tour_images (tour_id, url, alt, sort_order) VALUES (?, ?, ?, ?)`,
      params: [id, url.trim(), altParts.join("|").trim(), i],
    });
  });

  for (const loc of ["es", "en"] as const) {
    for (const section of ["included", "excluded", "bring"] as const) {
      lines(str(formData, `${section}_${loc}`)).forEach((label, i) => {
        statements.push({
          sql: `INSERT INTO tour_list_items (tour_id, locale, section, label, sort_order)
                VALUES (?, ?, ?, ?, ?)`,
          params: [id, loc, section, label, i],
        });
      });
    }
  }

  if (statements.length) await batch(statements);
  return id;
}

export async function deleteTour(
  rawLocale: string,
  id: number,
): Promise<ToursResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM tours WHERE id = ?`, id);
  revalidatePath(`/${locale}/tours`);
  revalidatePath(`/${locale}/admin/tours`);
  return { ok: true };
}
