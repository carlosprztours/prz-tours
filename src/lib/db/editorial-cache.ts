import "server-only";
import { query } from "./client";

export async function editorialHash(text: string, workersAi: boolean) {
  const bytes = new TextEncoder().encode(workersAi ? `m2m100:${text.trim()}` : text.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Resolve distinct source strings in bounded D1 reads (at most 100 bindings). */
export async function readEditorialEnglishBatch(sources: readonly (string | null)[]) {
  const distinct = [...new Set(sources.map((source) => source?.trim() ?? "").filter(Boolean))];
  const translated = new Map<string, string>();
  for (let i = 0; i < distinct.length; i += 50) {
    const group = distinct.slice(i, i + 50);
    const hashes = await Promise.all(group.map((source) =>
      Promise.all([editorialHash(source, true), editorialHash(source, false)]),
    ));
    const keys = hashes.flat();
    const rows = await query<{ source_hash: string; translated_text: string | null }>(
      `SELECT source_hash, translated_text FROM content_translation_cache
       WHERE status = 'translated' AND source_hash IN (${keys.map(() => "?").join(",")})`,
      ...keys,
    );
    const values = new Map(rows.map((row) => [row.source_hash, row.translated_text]));
    for (const [index, [ai, fallback]] of hashes.entries()) {
      translated.set(group[index], values.get(ai) ?? values.get(fallback) ?? "");
    }
  }
  return (source: string | null, manual = "") => manual.trim() ? manual : translated.get(source?.trim() ?? "") ?? "";
}
