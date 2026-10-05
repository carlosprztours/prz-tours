/**
 * Server Actions de mensajes de contacto (editor+) y ajustes (solo admin).
 */
"use server";

import { revalidatePath } from "next/cache";

import { requireEditor, requireStaffRoles } from "./access";
import { execute, query, queryOne } from "@/lib/db/client";
import type { ContactMessage, Locale } from "@/types";

export type SimpleResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const { locale } = await requireEditor(rawLocale);
  return locale;
}

async function requireAdminArea(rawLocale: string): Promise<Locale> {
  const { locale } = await requireStaffRoles(rawLocale, "admin");
  return locale;
}

// ───────────────────────────── Mensajes ─────────────────────────────

export async function listMessages(
  rawLocale: string,
  onlyUnread = false,
): Promise<ContactMessage[]> {
  await requireStaff(rawLocale);
  return query<ContactMessage>(
    `SELECT * FROM messages ${onlyUnread ? "WHERE is_read = 0" : ""}
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
  );
}

export async function getMessage(
  rawLocale: string,
  id: number,
): Promise<ContactMessage | null> {
  await requireStaff(rawLocale);
  return queryOne<ContactMessage>(`SELECT * FROM messages WHERE id = ?`, id);
}

export async function markMessageRead(
  rawLocale: string,
  id: number,
  read: boolean,
): Promise<SimpleResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`UPDATE messages SET is_read = ? WHERE id = ?`, read ? 1 : 0, id);
  revalidatePath(`/${locale}/admin/messages`);
  return { ok: true };
}

export async function deleteMessage(
  rawLocale: string,
  id: number,
): Promise<SimpleResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM messages WHERE id = ?`, id);
  revalidatePath(`/${locale}/admin/messages`);
  return { ok: true };
}

// ───────────────────────────── Ajustes ─────────────────────────────

export async function listSettings(
  rawLocale: string,
): Promise<{ key: string; value: string }[]> {
  await requireAdminArea(rawLocale);
  return query<{ key: string; value: string }>(
    `SELECT key, value FROM settings ORDER BY key ASC`,
  );
}

export async function saveSetting(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const locale = await requireAdminArea(rawLocale);
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  if (!key || !/^[a-z0-9_]+$/.test(key)) return { ok: false, error: "bad-key" };

  await execute(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    key,
    value,
  );
  revalidatePath(`/${locale}/admin/settings`);
  return { ok: true };
}

export async function deleteSetting(
  rawLocale: string,
  key: string,
): Promise<SimpleResult> {
  const locale = await requireAdminArea(rawLocale);
  await execute(`DELETE FROM settings WHERE key = ?`, key);
  revalidatePath(`/${locale}/admin/settings`);
  return { ok: true };
}
