/**
 * Server Action: actualizar el perfil del cliente (nombre y teléfono).
 *
 * El email no se puede cambiar aquí (es la identidad de la cuenta y la
 * clave con la que se buscan sus reservas).
 */
"use server";

import { verifyCustomerSession } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { execute, queryOne } from "@/lib/db/client";
import { isValidPhone, normalizePhone } from "@/lib/validation/phone";
import type { Locale } from "@/types";

export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(
  locale: Locale,
  _prevState: ProfileResult | undefined,
  formData: FormData,
): Promise<ProfileResult> {
  const session = await verifyCustomerSession(locale);

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2) return { ok: false, error: "bad-name" };
  if (phone && !isValidPhone(phone)) {
    return { ok: false, error: "bad-phone" };
  }

  await execute(
    `UPDATE users SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`,
    name,
    phone ? normalizePhone(phone) : null,
    session.user.id,
  );

  return { ok: true };
}

export type PasswordResult = { ok: true } | { ok: false; error: string };

export async function changePassword(
  locale: Locale,
  _prevState: PasswordResult | undefined,
  formData: FormData,
): Promise<PasswordResult> {
  const session = await verifyCustomerSession(locale);

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  if (next.length < 8) return { ok: false, error: "weak" };
  if (next === current) return { ok: false, error: "same" };

  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = ?`,
    session.user.id,
  );
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { ok: false, error: "wrong" };
  }

  await execute(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    await hashPassword(next),
    session.user.id,
  );

  const { revokeAllUserSessions, createSession } = await import("@/lib/auth/session");
  await revokeAllUserSessions(session.user.id);
  await createSession(session.user.id, session.user.role);

  return { ok: true };
}
