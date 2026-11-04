import "server-only";

import { execute, query, queryOne } from "@/lib/db/client";
import { translateEditorialText } from "./content-translation";

export const TOUR_EDITORIAL_FIELDS = [
  "title", "summary", "description", "seo_title", "seo_description",
  "included", "excluded", "bring", "pickup_note",
] as const;

export function tourEditorialSource(form: FormData) {
  return TOUR_EDITORIAL_FIELDS.map((field) =>
    String(form.get(field === "pickup_note" ? field : `${field}_es`) ?? "").trim(),
  );
}

/** Read the current Spanish row, not a possibly superseded form submission. */
export async function retryStoredTourEnglish(id: number) {
  const original = await queryOne<{
    title: string; summary: string; description: string;
    seo_title: string | null; seo_description: string | null; pickup_note: string | null;
  }>(
    `SELECT es.title, es.summary, es.description, es.seo_title, es.seo_description, t.pickup_note
     FROM tours t JOIN tour_translations es ON es.tour_id = t.id AND es.locale = 'es'
     JOIN tour_editorial_translation job ON job.tour_id = t.id AND job.status != 'translated'
     WHERE t.id = ? AND NOT EXISTS (
       SELECT 1 FROM tour_translations en WHERE en.tour_id = t.id AND en.locale = 'en'
     )`, id,
  );
  if (!original) return;
  const items = await query<{ section: string; label: string }>(
    `SELECT section, label FROM tour_list_items WHERE tour_id = ? AND locale = 'es'
     ORDER BY sort_order, id`, id,
  );
  const source = TOUR_EDITORIAL_FIELDS.map((field) => {
    if (field === "included" || field === "excluded" || field === "bring") {
      return items.filter((item) => item.section === field).map((item) => item.label).join("\n");
    }
    return (original[field] ?? "").trim();
  });
  await refreshTourEnglish(id, source);
}

export async function refreshTourEnglish(id: number, source: string[]) {
  const snapshot = JSON.stringify(source);
  try {
    const job = await queryOne<{ tour_id: number }>(
      `SELECT tour_id FROM tour_editorial_translation
       WHERE tour_id = ? AND source = ? AND status != 'translated' AND NOT EXISTS (
         SELECT 1 FROM tour_translations WHERE tour_id = ? AND locale = 'en'
       )`, id, snapshot, id,
    );
    if (!job) return;

    const results = [];
    for (const [index, value] of source.entries()) {
      const isList = ["included", "excluded", "bring"].includes(TOUR_EDITORIAL_FIELDS[index]);
      const parts = isList ? value.split("\n").map((line) => line.trim()).filter(Boolean) : [value];
      const translated = [];
      for (const part of parts) translated.push(await translateEditorialText(part));
      const status = translated.some((part) => part.status === "error") ? "error"
        : translated.every((part) => part.status === "translated") ? "translated" : "pending";
      results.push({ status, text: translated.map((part) => part.status === "translated" ? part.text : "").join("\n") });
    }
    const status = results.some((field) => field.status === "error") ? "error"
      : results.every((field) => field.status === "translated") ? "translated" : "pending";
    await execute(
      `UPDATE tour_editorial_translation
       SET status = ?, english = CASE WHEN ? = 'translated' THEN ? ELSE english END
       WHERE tour_id = ? AND source = ? AND status != 'translated' AND NOT EXISTS (
         SELECT 1 FROM tour_translations WHERE tour_id = ? AND locale = 'en'
       )`,
      status, status, JSON.stringify(results.map((field) => field.text)), id, snapshot, id,
    );
  } catch {
    await execute(
      "UPDATE tour_editorial_translation SET status = 'error' WHERE tour_id = ? AND source = ? AND status != 'translated'",
      id, snapshot,
    ).catch(() => undefined);
  }
}
