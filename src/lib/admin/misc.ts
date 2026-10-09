/**
 * Server Actions de mensajes de contacto (editor+) y ajustes (solo admin).
 */
"use server";

import { revalidatePath } from "next/cache";

import { requireEditor, requireStaffRoles, isSuperAdminEmail } from "./access";
import { ALL_TEXT_BASES, isSensitiveKey } from "./site-texts";
import { execute, query, queryOne } from "@/lib/db/client";
import type { ContactMessage, Locale } from "@/types";

export type SimpleResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const { locale } = await requireEditor(rawLocale);
  return locale;
}

async function requireAdminArea(rawLocale: string) {
  const { locale, session } = await requireStaffRoles(rawLocale, "admin");
  return { locale, session };
}

/** Área de ajustes: admin siempre; sensibles solo super-admin. */
async function requireSettingsAccess(rawLocale: string, key?: string) {
  const { locale, session } = await requireAdminArea(rawLocale);
  const isSuper = isSuperAdminEmail(session.user.email);
  if (key && isSensitiveKey(key) && !isSuper) throw new Error("forbidden");
  return { locale, isSuper };
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
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  if (!key || !/^[a-z0-9_]+$/.test(key)) return { ok: false, error: "bad-key" };
  let locale: Locale;
  try {
    ({ locale } = await requireSettingsAccess(rawLocale, key));
  } catch {
    return { ok: false, error: "forbidden" };
  }

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
  let locale: Locale;
  try {
    ({ locale } = await requireSettingsAccess(rawLocale, key));
  } catch {
    return { ok: false, error: "forbidden" };
  }
  await execute(`DELETE FROM settings WHERE key = ?`, key);
  revalidatePath(`/${locale}/admin/settings`);
  return { ok: true };
}

/** ¿El lector actual puede ver/tocar claves sensibles? (para la UI). */
export async function canSeeSensitive(rawLocale: string): Promise<boolean> {
  const { isSuper } = await requireSettingsAccess(rawLocale);
  return isSuper;
}

// ───────────────────────────── Textos editables ─────────────────────────────

/**
 * Guarda el par ES/EN de un texto del catálogo (Textos). Solo claves del
 * catálogo: nada sensible pasa por aquí.
 */
export async function saveTextPair(
  rawLocale: string,
  _prev: SimpleResult | undefined,
  formData: FormData,
): Promise<SimpleResult> {
  const { locale } = await requireStaffRoles(rawLocale, "admin", "editor");
  const base = String(formData.get("base") ?? "").trim();
  if (!base || !ALL_TEXT_BASES.includes(base)) return { ok: false, error: "bad-key" };
  const es = String(formData.get("value_es") ?? "");
  const en = String(formData.get("value_en") ?? "");
  for (const [suffix, value] of [["es", es], ["en", en]] as const) {
    await execute(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      `${base}_${suffix}`,
      value,
    );
  }
  revalidatePath(`/${locale}/admin/textos`);
  revalidatePath(`/${locale}`);
  return { ok: true };
}
