/**
 * Preguntas frecuentes públicas.
 */
import "server-only";

import { query } from "./client";
import type { Faq } from "@/types";

export async function listPublishedFaqs(limit = 20): Promise<Faq[]> {
  return query<Faq>(
    `SELECT * FROM faqs WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT ?`,
    Math.min(Math.max(limit, 1), 50),
  );
}
