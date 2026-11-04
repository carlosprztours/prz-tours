import "server-only";

import { execute } from "@/lib/db/client";
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

export async function refreshTourEnglish(id: number, source: string[], previewTour: boolean) {
  const snapshot = JSON.stringify(source);
  try {
    const results = [];
    for (const [index, value] of source.entries()) {
      const isList = ["included", "excluded", "bring"].includes(TOUR_EDITORIAL_FIELDS[index]);
      const parts = isList ? value.split("\n").map((line) => line.trim()).filter(Boolean) : [value];
      const translated = [];
      for (const part of parts) translated.push(await translateEditorialText(part, previewTour));
      const status = translated.some((part) => part.status === "error") ? "error"
        : translated.every((part) => part.status === "translated") ? "translated" : "pending";
      results.push({ status, text: translated.map((part) => part.status === "translated" ? part.text : "").join("\n") });
    }
    const status = results.some((field) => field.status === "error") ? "error"
      : results.every((field) => field.status === "translated") ? "translated" : "pending";
    await execute(
      `UPDATE tour_editorial_translation
       SET status = ?, english = CASE WHEN ? = 'translated' THEN ? ELSE english END
       WHERE tour_id = ? AND source = ?`,
      status, status, JSON.stringify(results.map((field) => field.text)), id, snapshot,
    );
  } catch {
    await execute(
      "UPDATE tour_editorial_translation SET status = 'error' WHERE tour_id = ? AND source = ?",
      id, snapshot,
    ).catch(() => undefined);
  }
}
