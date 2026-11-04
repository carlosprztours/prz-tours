import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { editorialHash } from "@/lib/db/editorial-cache";
import { execute, getEnvVar, queryOne } from "@/lib/db/client";

type TranslationResult =
  | { status: "translated"; text: string }
  | { status: "pending" | "error" };

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 60_000;

/**
 * Only call for editorial text. Technical fields, personal data and manually
 * reviewed translations must stay outside this pipeline.
 * A new source hash invalidates the cached English without deleting old text.
 */
export async function translateEditorialText(source: string): Promise<TranslationResult> {
  const text = source.trim();
  if (!text) return { status: "translated", text: "" };

  const endpoint = await getEnvVar("EDITORIAL_TRANSLATION_URL");
  const workersAi = await getEnvVar("EDITORIAL_TRANSLATION_WORKERS_AI") === "true";
  if (workersAi && text.length > 800) return { status: "pending" };
  if (!endpoint && !workersAi) return { status: "pending" };

  const hash = await editorialHash(text, workersAi);
  await execute("INSERT OR IGNORE INTO content_translation_cache (source_hash, status) VALUES (?, 'pending')", hash);

  const now = Date.now();
  const claim = await execute(
    `UPDATE content_translation_cache
     SET status = 'pending', attempts = attempts + 1, retry_after = ?
     WHERE source_hash = ? AND status != 'translated' AND attempts < ? AND retry_after <= ?`,
    now + RETRY_DELAY_MS, hash, MAX_ATTEMPTS, now,
  );
  if (!claim.meta.changes) {
    const cached = await queryOne<{ status: "pending" | "translated" | "error"; translated_text: string | null }>(
      "SELECT status, translated_text FROM content_translation_cache WHERE source_hash = ?", hash,
    );
    if (cached?.status === "translated" && cached.translated_text) {
      return { status: "translated", text: cached.translated_text };
    }
    return { status: cached?.status === "error" ? "error" : "pending" };
  }

  let translated: string;
  try {
    if (workersAi) {
      const { env } = await getCloudflareContext({ async: true });
      const binding = (env as unknown as { AI?: Ai }).AI;
      if (!binding) throw new Error("Workers AI binding missing");
      const budget = await execute(
        `UPDATE preview_translation_budget
         SET calls = CASE WHEN expires_at <= unixepoch() THEN 1 ELSE calls + 1 END,
             chars = CASE WHEN expires_at <= unixepoch() THEN ? ELSE chars + ? END,
             expires_at = (unixepoch() / 86400 + 1) * 86400,
             busy = 1
         WHERE id = 1 AND busy = 0 AND halted != 1 AND halted <= unixepoch()
           AND (expires_at <= unixepoch() OR (calls < 24 AND chars + ? <= 6000))`,
        text.length, text.length, text.length,
      );
      if (!budget.meta.changes) {
        await execute(
          `UPDATE content_translation_cache SET attempts = attempts - 1, retry_after = 0
           WHERE source_hash = ? AND retry_after = ?`,
          hash, now + RETRY_DELAY_MS,
        );
        return { status: "pending" };
      }
      try {
        const result = await binding.run("@cf/meta/m2m100-1.2b", {
          text, source_lang: "es", target_lang: "en",
        });
        translated = "translated_text" in result ? result.translated_text?.trim() ?? "" : "";
        if (!translated) throw new Error("Empty translation");
        await execute("UPDATE preview_translation_budget SET busy = 0 WHERE id = 1");
      } catch (error) {
        const details = typeof error === "object" && error !== null ? error as { code?: unknown; message?: unknown } : {};
        const quota = String(details.code) === "3036" || /\b3036\b/.test(String(details.message));
        await execute(
          `UPDATE preview_translation_budget SET busy = 0,
             halted = CASE WHEN halted = 1 THEN 1 WHEN ? = 1 THEN (unixepoch() / 86400 + 1) * 86400
                           ELSE unixepoch() + 60 END WHERE id = 1`,
          quota ? 1 : 0,
        );
        if (quota) return { status: "pending" };
        throw error;
      }
    } else {
      const url = new URL(endpoint!);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid translation endpoint");
      const apiKey = await getEnvVar("EDITORIAL_TRANSLATION_API_KEY");
      const response = await fetch(url, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "es", target: "en", format: "text", api_key: apiKey }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error("Translation request failed");
      const body = await response.json() as { translatedText?: unknown };
      translated = typeof body.translatedText === "string" ? body.translatedText.trim() : "";
    }
    if (!translated) throw new Error("Empty translation");
  } catch {
    await execute(
      "UPDATE content_translation_cache SET status = 'error' WHERE source_hash = ? AND retry_after = ?",
      hash, now + RETRY_DELAY_MS,
    );
    return { status: "error" };
  }

  await execute(
    `UPDATE content_translation_cache SET status = 'translated', translated_text = ?, retry_after = 0
     WHERE source_hash = ? AND retry_after = ?`,
    translated, hash, now + RETRY_DELAY_MS,
  );
  return { status: "translated", text: translated };
}


export async function warmEditorialEnglish(...pairs: [source: string, manual: string][]) {
  for (const [source, manual] of pairs) {
    if (source && !manual) await translateEditorialText(source).catch(() => undefined);
  }
}
