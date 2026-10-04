/**
 * Consultas públicas de traslados, testimonios, galería y ajustes.
 *
 * Cada entidad tiene su propio archivo solo cuando crece lo suficiente para
 * justificarlo; estas cuatro son lecturas simples y viven juntas aquí con
 * nombres claros. Si alguna necesita escritura desde el panel, su Server
 * Action vive en `src/lib/admin/<entidad>.ts`, no aquí.
 */
import "server-only";

import { query, queryOne } from "./client";
import type {
  GalleryImage,
  Testimonial,
  TransferRoute,
} from "@/types";

// ───────────────────────────── Traslados ─────────────────────────────

export async function listPublishedTransferRoutes(): Promise<TransferRoute[]> {
  return query<TransferRoute>(
    `SELECT id, origin_key, origin_label, origin_airport, destination,
            price_1_5, price_6_11, price_note, sort_order, is_published
     FROM transfer_routes
     WHERE is_published = 1
     ORDER BY sort_order ASC, id ASC`,
  );
}

// ───────────────────────────── Testimonios ─────────────────────────────

export async function listPublishedTestimonials(
  limit = 12,
  tourSlug?: string,
): Promise<Testimonial[]> {
  if (tourSlug) {
    return query<Testimonial>(
      `SELECT id, author_name, author_origin, rating, text_es, text_en,
              tour_slug, avatar_url, is_published, sort_order, created_at
       FROM testimonials
       WHERE is_published = 1 AND tour_slug = ?
       ORDER BY sort_order ASC, id ASC
       LIMIT ?`,
      tourSlug,
      limit,
    );
  }
  return query<Testimonial>(
    `SELECT id, author_name, author_origin, rating, text_es, text_en,
            tour_slug, avatar_url, is_published, sort_order, created_at
     FROM testimonials
     WHERE is_published = 1
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    limit,
  );
}

// ───────────────────────────── Galería ─────────────────────────────

export async function listPublishedGalleryImages(
  limit = 24,
): Promise<GalleryImage[]> {
  return query<GalleryImage>(
    `SELECT id, url, alt, caption, is_published, sort_order, created_at
     FROM gallery_images
     WHERE is_published = 1
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    limit,
  );
}

// ───────────────────────────── Ajustes ─────────────────────────────

/** Todos los ajustes como objeto clave/valor. */

/** Un ajuste con valor por defecto si no existe. */
export async function getSetting(
  key: string,
  fallback = "",
): Promise<string> {
  const row = await queryOne<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    key,
  );
  return row?.value ?? fallback;
}
