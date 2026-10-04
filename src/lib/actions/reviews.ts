/**
 * Server Action pública: dejar una opinión sobre un tour.
 *
 * Se guarda como testimonio NO publicado (`is_published = 0`): el equipo la
 * revisa y la publica desde el panel. Así no hay spam visible sin moderar.
 */
"use server";

import * as z from "zod";

import { execute } from "@/lib/db/client";
import type { Locale } from "@/types";

const reviewSchema = z.object({
  tourSlug: z.string().trim().min(1).max(120),
  authorName: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10).max(1500),
  honeypot: z.string().max(0).optional(),
});

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function submitReview(
  _locale: Locale,
  _prevState: ReviewResult | undefined,
  formData: FormData,
): Promise<ReviewResult> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // Honeypot: los bots lo rellenan, los humanos no lo ven.
  if (parsed.data.honeypot) return { ok: true };

  try {
    await execute(
      `INSERT INTO testimonials
         (author_name, author_origin, rating, text_es, text_en, tour_slug, is_published, sort_order)
       VALUES (?, '', ?, ?, ?, ?, 0, 100)`,
      parsed.data.authorName,
      parsed.data.rating,
      parsed.data.text,
      parsed.data.text,
      parsed.data.tourSlug,
    );
  } catch (err) {
    console.error("[reviews] insert error:", err);
    return { ok: false, error: "server" };
  }
  return { ok: true };
}
