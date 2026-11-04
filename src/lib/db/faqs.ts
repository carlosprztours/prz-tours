/**
 * Preguntas frecuentes públicas.
 */
import "server-only";

import { readEditorialEnglishBatch } from "./editorial-cache";
import { query } from "./client";
import type { Faq, Locale } from "@/types";

export async function listPublishedFaqs(locale: Locale, limit = 20): Promise<Faq[]> {
  const rows = await query<Faq>(
    `SELECT * FROM faqs WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT ?`,
    Math.min(Math.max(limit, 1), 50),
  );
  if (locale === "es") return rows;
  const english = await readEditorialEnglishBatch(rows.flatMap((row) => [row.question_en.trim() ? null : row.question_es, row.answer_en.trim() ? null : row.answer_es]));
  const localized = rows.map((row) => ({
    ...row,
    question_en: english(row.question_es, row.question_en),
    answer_en: english(row.answer_es, row.answer_en),
  }));
  return localized.filter((row) => row.question_en.trim() && row.answer_en.trim());
}
