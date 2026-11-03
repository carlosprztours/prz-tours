import "server-only";
import { queryOne } from "./client";

export async function editorialHash(text: string, workersAi: boolean) {
  const bytes = new TextEncoder().encode(workersAi ? `m2m100:${text.trim()}` : text.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function readEditorialEnglish(source: string, manual: string) {
  if (manual.trim()) return manual;
  if (!source.trim()) return "";
  const keys = await Promise.all([editorialHash(source, true), editorialHash(source, false)]);
  const row = await queryOne<{ translated_text: string }>(
    `SELECT translated_text FROM content_translation_cache
     WHERE source_hash IN (?, ?) AND status = 'translated'
     ORDER BY source_hash = ? DESC LIMIT 1`, ...keys, keys[0],
  );
  return row?.translated_text ?? "";
}
