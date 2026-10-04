/**
 * Registro de auditoría: quién hizo qué en el panel.
 */
import "server-only";

import { execute, query } from "@/lib/db/client";
import type { ActivityEntry } from "@/types";

export async function logActivity(
  action: string,
  detail?: string,
  userId?: number | null,
  actor?: string | null,
): Promise<void> {
  await execute(
    `INSERT INTO activity_log (user_id, actor, action, detail)
     VALUES (?, ?, ?, ?)`,
    userId ?? null,
    actor ?? "staff",
    action,
    detail ?? null,
  ).catch((err) => console.error("[activity] log error:", err));
}

export async function listActivity(limit = 100): Promise<ActivityEntry[]> {
  return query<ActivityEntry>(
    `SELECT a.id, a.user_id, a.actor, a.action, a.detail, a.created_at,
            u.email AS actor_email
     FROM activity_log a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC
     LIMIT ?`,
    Math.min(Math.max(limit, 1), 200),
  );
}
