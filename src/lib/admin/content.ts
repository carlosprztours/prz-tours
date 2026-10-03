/**
 * Server Actions de testimonios y galería (staff).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { execute, query, queryOne } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import type { GalleryImage, Locale, Testimonial } from "@/types";

export type SimpleResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  await verifySession(locale);
  return locale;
}

// ───────────────────────────── Testimonios ─────────────────────────────

export async function listAdminTestimonials(rawLocale: string): Promise<Testimonial[]> {
  await requireStaff(rawLocale);
  return query<Testimonial>(`SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC`);
}

export async function getAdminTestimonial(
  rawLocale: string,
  id: number,
): Promise<Testimonial | null> {
  await requireStaff(rawLocale);
  return queryOne<Testimonial>(`SELECT * FROM testimonials WHERE id = ?`, id);
}

function parseTestimonial(formData: FormData) {
  const rating = Math.round(Number(formData.get("rating")) || 5);
  return {
    author_name: String(formData.get("author_name") ?? "").trim(),
    author_origin: String(formData.get("author_origin") ?? "").trim(),
    rating: Math.min(5, Math.max(1, rating)),
    text_es: String(formData.get("text_es") ?? "").trim(),
    text_en: String(formData.get("text_en") ?? "").trim(),
    tour_slug: String(formData.get("tour_slug") ?? "").trim() || null,
    avatar_url: String(formData.get("avatar_url") ?? "").trim() || null,
    sort_order: Math.round(Number(formData.get("sort_order")) || 0),
    is_published: formData.get("is_published") === "on" ? 1 : 0,
  };
}

export async function createTestimonial(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireStaff(rawLocale);
  const t = parseTestimonial(formData);
  if (!t.author_name || !t.text_es) return { ok: false, error: "required" };

  await execute(
    `INSERT INTO testimonials
       (author_name, author_origin, rating, text_es, text_en, tour_slug, avatar_url, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    t.author_name,
    t.author_origin,
    t.rating,
    t.text_es,
    t.text_en,
    t.tour_slug,
    t.avatar_url,
    t.is_published,
    t.sort_order,
  );
  revalidatePath(`/${locale}`);
  redirect(`/${locale}/admin/testimonials`);
}

export async function updateTestimonial(
  rawLocale: string,
  id: number,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireStaff(rawLocale);
  const t = parseTestimonial(formData);
  if (!t.author_name || !t.text_es) return { ok: false, error: "required" };

  await execute(
    `UPDATE testimonials SET author_name = ?, author_origin = ?, rating = ?,
       text_es = ?, text_en = ?, tour_slug = ?, avatar_url = ?,
       is_published = ?, sort_order = ? WHERE id = ?`,
    t.author_name,
    t.author_origin,
    t.rating,
    t.text_es,
    t.text_en,
    t.tour_slug,
    t.avatar_url,
    t.is_published,
    t.sort_order,
    id,
  );
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/admin/testimonials`);
  return { ok: true };
}

export async function deleteTestimonial(
  rawLocale: string,
  id: number,
): Promise<SimpleResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM testimonials WHERE id = ?`, id);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/admin/testimonials`);
  return { ok: true };
}

// ───────────────────────────── Galería ─────────────────────────────

export async function listAdminGallery(rawLocale: string): Promise<GalleryImage[]> {
  await requireStaff(rawLocale);
  return query<GalleryImage>(`SELECT * FROM gallery_images ORDER BY sort_order ASC, id ASC`);
}

export async function createGalleryImage(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireStaff(rawLocale);
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: "required" };

  await execute(
    `INSERT INTO gallery_images (url, alt, caption, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    url,
    String(formData.get("alt") ?? "").trim(),
    String(formData.get("caption") ?? "").trim() || null,
    formData.get("is_published") === "on" ? 1 : 0,
    Math.round(Number(formData.get("sort_order")) || 0),
  );
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true };
}

export async function deleteGalleryImage(
  rawLocale: string,
  id: number,
): Promise<SimpleResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM gallery_images WHERE id = ?`, id);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true };
}
