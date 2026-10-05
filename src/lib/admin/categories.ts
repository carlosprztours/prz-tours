/**
 * Categorías de tour (editor+): lista y alta desde el panel.
 *
 * Las categorías son filas de `tour_categories`; `tours.category` guarda el
 * `slug`. El admin crea las que necesite y las deactivate sin borrar tours
 * (borrar una categoría usada deja los tours con `other`).
 */
"use server";

import { revalidatePath } from "next/cache";

import { requireEditor } from "./access";
import { autoTranslateTour } from "./translate";
import { execute, query, queryOne } from "@/lib/db/client";
import type { TourCategoryRow } from "@/types";

export type CategoryResult = { ok: true } | { ok: false; error: string };

export async function listTourCategories(rawLocale: string): Promise<TourCategoryRow[]> {
  const { locale } = await requireEditor(rawLocale);
  void locale;
  return query<TourCategoryRow>(
    `SELECT * FROM tour_categories ORDER BY sort_order ASC, label_es ASC`,
  );
}

export async function createTourCategory(
  rawLocale: string,
  _prev: CategoryResult | undefined,
  formData: FormData,
): Promise<CategoryResult> {
  const { locale } = await requireEditor(rawLocale);

  const labelEs = String(formData.get("label_es") ?? "").trim();
  const labelEnInput = String(formData.get("label_en") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "✨";
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (labelEs.length < 2) return { ok: false, error: "bad-label" };

  const slug = slugify(slugInput || labelEs);
  if (!slug) return { ok: false, error: "bad-slug" };

  const exists = await queryOne<{ id: number }>(
    `SELECT id FROM tour_categories WHERE slug = ?`,
    slug,
  );
  if (exists) return { ok: false, error: "slug-taken" };

  // Si no escriben el nombre en inglés, se traduce desde el español.
  const fd = new FormData();
  fd.set("label_es", labelEs);
  const translatedLabel = String((await autoTranslateTour(fd)).get("label_en") ?? "").trim();
  const labelEn = labelEnInput || translatedLabel || labelEs;

  const last = await queryOne<{ n: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) AS n FROM tour_categories`,
  );
  await execute(
    `INSERT INTO tour_categories (slug, label_es, label_en, icon, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    slug,
    labelEs,
    labelEn,
    icon,
    (last?.n ?? 0) + 1,
  );

  revalidatePath(`/${locale}/admin/tours`);
  revalidatePath(`/${locale}/admin/tours/new`);
  revalidatePath(`/${locale}/tours`);
  return { ok: true };
}

/** Activa/desactiva una categoría sin tocar los tours que la usan. */
export async function toggleTourCategory(
  rawLocale: string,
  id: number,
  active: boolean,
): Promise<CategoryResult> {
  const { locale } = await requireEditor(rawLocale);
  await execute(
    `UPDATE tour_categories SET is_active = ? WHERE id = ?`,
    active ? 1 : 0,
    id,
  );
  revalidatePath(`/${locale}/admin/tours`);
  revalidatePath(`/${locale}/tours`);
  return { ok: true };
}

/** Borra la categoría; los tours que la usaban pasan a `other`. */
export async function deleteTourCategory(
  rawLocale: string,
  id: number,
): Promise<CategoryResult> {
  const { locale } = await requireEditor(rawLocale);
  const row = await queryOne<{ slug: string }>(
    `SELECT slug FROM tour_categories WHERE id = ?`,
    id,
  );
  if (!row) return { ok: false, error: "not-found" };

  await execute(`UPDATE tours SET category = 'other' WHERE category = ?`, row.slug);
  await execute(`DELETE FROM tour_categories WHERE id = ?`, id);
  revalidatePath(`/${locale}/admin/tours`);
  revalidatePath(`/${locale}/tours`);
  return { ok: true };
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}