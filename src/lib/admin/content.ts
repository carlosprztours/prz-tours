/**
 * Server Actions de testimonios y galería (staff).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireEditor, requireStaffRoles } from "./access";
import { execute, query, queryOne } from "@/lib/db/client";
import type { GalleryImage, GalleryVideo, Locale, Testimonial } from "@/types";

/** `count` lo usan las acciones que crean varias filas de una vez (galería). */
export type SimpleResult = { ok: true; count?: number } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const { locale } = await requireEditor(rawLocale);
  return locale;
}

// ───────────────────────────── Testimonios (editor+) ─────────────────────────────

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

// ───────────────────────────── Galería (fotógrafo incluido) ─────────────────────────────

async function requireGallery(rawLocale: string): Promise<Locale> {
  const { locale } = await requireStaffRoles(rawLocale, "admin", "editor", "photographer");
  return locale;
}

export async function listAdminGallery(rawLocale: string): Promise<GalleryImage[]> {
  await requireGallery(rawLocale);
  return query<GalleryImage>(`SELECT * FROM gallery_images ORDER BY sort_order ASC, id ASC`);
}

export async function createGalleryImage(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireGallery(rawLocale);

  // Se aceptan varias fotos en un solo envío (`urls`), para no tener que
  // repetir el formulario una por cada imagen. `url` sigue funcionando para
  // cuando se pega una a mano.
  const pegadas = formData
    .getAll("urls")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const sueltas = [String(formData.get("url") ?? "").trim()].filter(Boolean);
  const urls = [...pegadas, ...sueltas];
  // A mismo formulario puede llegar también vídeo (`video_urls`): va a la
  // tabla de vídeos como galería pública sin título.
  const videos = formData
    .getAll("video_urls")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (urls.length === 0 && videos.length === 0) return { ok: false, error: "required" };

  const alt = String(formData.get("alt") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const publicado = formData.get("is_published") === "on" ? 1 : 0;

  // El campo «Orden» dice dónde coloca la(s) foto(s). El formulario pone 0 por
  // defecto, que significa «al principio»; se respeta tal cual, y al subir
  // varias de golpe se van siguiendo (0, 1, 2…) en el orden elegido. Si no
  // viene el campo, se añaden al final de la lista.
  const ordenPedido = String(formData.get("sort_order") ?? "").trim();
  const ultimo = await queryOne<{ n: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) AS n FROM gallery_images`,
  );
  let siguiente = ordenPedido === "" ? (ultimo?.n ?? 0) : Math.round(Number(ordenPedido) || 0);

  for (const [indice, url] of urls.entries()) {
    siguiente += 1;
    // Con varias fotos, un único texto alternativo no describe bien todas: se
    // aplica solo a la primera y el fotógrafo escribe el de cada una en su
    // ficha. Con una sola foto, el texto va a esa.
    const altDeEsta = indice === 0 ? alt : "";
    await execute(
      `INSERT INTO gallery_images (url, alt, caption, is_published, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      url,
      altDeEsta,
      caption || null,
      publicado,
      siguiente,
    );
  }

  const ultimoVideo = await queryOne<{ n: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) AS n FROM gallery_videos`,
  );
  for (const [indice, video] of videos.entries()) {
    await execute(
      `INSERT INTO gallery_videos (url, title, placement, is_published, sort_order)
       VALUES (?, '', 'gallery', ?, ?)`,
      video,
      publicado,
      (ultimoVideo?.n ?? 0) + indice + 1,
    );
  }

  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/gallery`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true, count: urls.length + videos.length };
}

export async function updateGalleryImage(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireGallery(rawLocale);
  const id = Math.round(Number(formData.get("id")) || 0);
  if (!id) return { ok: false, error: "required" };

  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: "required" };

  await execute(
    `UPDATE gallery_images
        SET url = ?, alt = ?, caption = ?, is_published = ?, sort_order = ?
      WHERE id = ?`,
    url,
    String(formData.get("alt") ?? "").trim(),
    String(formData.get("caption") ?? "").trim() || null,
    formData.get("is_published") === "on" ? 1 : 0,
    Math.round(Number(formData.get("sort_order")) || 0),
    id,
  );

  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/gallery`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true };
}

export async function deleteGalleryImage(
  rawLocale: string,
  id: number,
): Promise<SimpleResult> {
  const locale = await requireGallery(rawLocale);
  await execute(`DELETE FROM gallery_images WHERE id = ?`, id);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/gallery`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true };
}

// ───────────────────────────── Vídeos ─────────────────────────────

export async function listAdminGalleryVideos(
  rawLocale: string,
): Promise<GalleryVideo[]> {
  await requireGallery(rawLocale);
  return query<GalleryVideo>(
    `SELECT * FROM gallery_videos ORDER BY sort_order ASC, id ASC`,
  );
}

/** Tours publicados, para elegir a qué ruta asignar un vídeo. */
export async function listTourSlugsForPicker(
  locale: Locale,
): Promise<{ slug: string; title: string }[]> {
  return query<{ slug: string; title: string }>(
    `SELECT t.slug AS slug,
            COALESCE(MAX(CASE WHEN tr.locale = ? THEN tr.title END), MAX(tr.title)) AS title
     FROM tours t
     LEFT JOIN tour_translations tr ON tr.tour_id = t.id
     WHERE t.is_published = 1
     GROUP BY t.id
     ORDER BY t.sort_order ASC, t.id ASC`,
    locale,
  );
}

export async function createGalleryVideo(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireGallery(rawLocale);
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: "required" };

  const placementRaw = String(formData.get("placement") ?? "gallery");
  const placement = placementRaw === "tour" ? "tour" : "gallery";
  const tourSlug =
    placement === "tour"
      ? String(formData.get("tour_slug") ?? "").trim() || null
      : null;

  const ultimo = await queryOne<{ n: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) AS n FROM gallery_videos`,
  );
  await execute(
    `INSERT INTO gallery_videos (url, poster, title, caption, placement, tour_slug, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    url,
    String(formData.get("poster") ?? "").trim() || null,
    String(formData.get("title") ?? "").trim(),
    String(formData.get("caption") ?? "").trim() || null,
    placement,
    tourSlug,
    formData.get("is_published") === "on" ? 1 : 0,
    Number.isFinite(Number(formData.get("sort_order")))
      ? Math.round(Number(formData.get("sort_order")))
      : (ultimo?.n ?? 0) + 1,
  );
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/gallery`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true };
}

export async function updateGalleryVideo(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireGallery(rawLocale);
  const id = Math.round(Number(formData.get("id")) || 0);
  if (!id) return { ok: false, error: "required" };

  const placementRaw = String(formData.get("placement") ?? "gallery");
  const placement = placementRaw === "tour" ? "tour" : "gallery";
  const tourSlug =
    placement === "tour"
      ? String(formData.get("tour_slug") ?? "").trim() || null
      : null;

  await execute(
    `UPDATE gallery_videos
        SET poster = ?, title = ?, caption = ?, placement = ?, tour_slug = ?, is_published = ?, sort_order = ?
      WHERE id = ?`,
    String(formData.get("poster") ?? "").trim() || null,
    String(formData.get("title") ?? "").trim(),
    String(formData.get("caption") ?? "").trim() || null,
    placement,
    tourSlug,
    formData.get("is_published") === "on" ? 1 : 0,
    Math.round(Number(formData.get("sort_order")) || 0),
    id,
  );
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/gallery`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true };
}

export async function deleteGalleryVideo(
  rawLocale: string,
  id: number,
): Promise<SimpleResult> {
  const locale = await requireGallery(rawLocale);
  await execute(`DELETE FROM gallery_videos WHERE id = ?`, id);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/gallery`);
  revalidatePath(`/${locale}/admin/gallery`);
  return { ok: true };
}
