import { createHmac, timingSafeEqual } from "node:crypto";
import { recoverEditorialField } from "@/lib/admin/editorial-recovery";
import { retryStoredTourEnglish } from "@/lib/admin/tour-editorial-translation";
import { getEnvVar, queryOne } from "@/lib/db/client";

export async function POST(request: Request) {
  if (await getEnvVar("EDITORIAL_TRANSLATION_WORKERS_AI") !== "true") {
    return new Response(null, { status: 404 });
  }
  const secret = await getEnvVar("AUTH_SECRET");
  const timestamp = request.headers.get("x-editorial-scheduled-time") ?? "";
  const scheduledTime = Number(timestamp);
  if (!secret || !Number.isSafeInteger(scheduledTime) || Math.abs(Date.now() - scheduledTime) > 300_000) {
    return new Response(null, { status: 404 });
  }
  const supplied = Buffer.from(request.headers.get("x-editorial-signature") ?? "");
  const expected = Buffer.from(createHmac("sha256", secret).update(`editorial-recovery:${timestamp}`).digest("hex"));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return new Response(null, { status: 404 });
  }

  const minute = Math.floor(scheduledTime / 60_000);
  const module = minute % 6;
  const turn = Math.floor(minute / 6);
  if (module !== 0) {
    const budget = await queryOne<{ id: number }>(
      `SELECT id FROM preview_translation_budget WHERE id = 1 AND busy = 0
       AND halted != 1 AND halted <= unixepoch()
       AND (expires_at <= unixepoch() OR (calls < 24 AND chars < 6000))`,
    );
    if (budget) await recoverEditorialField(module - 1, turn);
    return new Response(null, { status: 204 });
  }

  // Rotate through pending tours so an exhausted or oversized text cannot
  // prevent other tours from being considered. The adapter claims each cache
  // key and atomically reserves budget before inference, including retries.
  const job = await queryOne<{ tour_id: number }>(
    `WITH eligible AS (
       SELECT job.tour_id, row_number() OVER (ORDER BY job.tour_id) AS ordinal,
              count(*) OVER () AS total
       FROM tour_editorial_translation job
       JOIN tour_translations es ON es.tour_id = job.tour_id AND es.locale = 'es'
       WHERE job.status IN ('pending', 'outdated', 'error') AND NOT EXISTS (
         SELECT 1 FROM tour_translations en WHERE en.tour_id = job.tour_id AND en.locale = 'en'
       )
     )
     SELECT tour_id FROM eligible WHERE ordinal = (? % total) + 1
       AND EXISTS (
         SELECT 1 FROM preview_translation_budget WHERE id = 1 AND busy = 0
           AND halted != 1 AND halted <= unixepoch()
           AND (expires_at <= unixepoch() OR (calls < 24 AND chars < 6000))
       )`,
    turn,
  );
  if (job) {
    await retryStoredTourEnglish(job.tour_id, true);
    console.info("[editorial-recovery] processed tour", job.tour_id);
  }
  return new Response(null, { status: 204 });
}
