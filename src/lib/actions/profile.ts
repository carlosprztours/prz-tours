/**
 * Server Action: actualizar el perfil del cliente (nombre y teléfono).
 *
 * El email no se puede cambiar aquí (es la identidad de la cuenta y la
 * clave con la que se buscan sus reservas).
 */
"use server";

import { verifyCustomerSession } from "@/lib/auth/dal";
import { execute } from "@/lib/db/client";
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
  if (phone && !/^[+()\-.\s\d]{6,40}$/.test(phone)) {
    return { ok: false, error: "bad-phone" };
  }

  await execute(
    `UPDATE users SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`,
    name,
    phone || null,
    session.user.id,
  );

  return { ok: true };
}
