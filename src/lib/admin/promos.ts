/**
 * Server Actions de códigos promocionales (staff).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { execute, query, queryOne } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import type { Locale, PromoCode } from "@/types";

export type PromosResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  await verifySession(locale);
  return locale;
}

export async function listAdminPromos(rawLocale: string): Promise<PromoCode[]> {
  await requireStaff(rawLocale);
  return query<PromoCode>(`SELECT * FROM promo_codes ORDER BY is_active DESC, code ASC`);
}

export async function getAdminPromo(
  rawLocale: string,
  id: number,
): Promise<PromoCode | null> {
  await requireStaff(rawLocale);
  return queryOne<PromoCode>(`SELECT * FROM promo_codes WHERE id = ?`, id);
}

function parse(form: FormData) {
  const kind = String(form.get("kind") ?? "percent");
  const maxUsesRaw = String(form.get("max_uses") ?? "").trim();
  return {
    code: String(form.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20),
    kind: (kind === "amount" ? "amount" : "percent") as "percent" | "amount",
    value: Math.max(0, Number(form.get("value")) || 0),
    max_uses: maxUsesRaw === "" ? null : Math.max(1, Math.round(Number(maxUsesRaw) || 0)),
    valid_from: String(form.get("valid_from") ?? "").trim() || null,
    valid_to: String(form.get("valid_to") ?? "").trim() || null,
    is_active: form.get("is_active") === "on" ? 1 : 0,
  };
}

export async function createPromo(
  rawLocale: string,
  _prev: PromosResult | undefined,
  formData: FormData,
): Promise<PromosResult> {
  const locale = await requireStaff(rawLocale);
  const p = parse(formData);
  if (!p.code || p.value <= 0) return { ok: false, error: "required" };
  try {
    await execute(
      `INSERT INTO promo_codes (code, kind, value, max_uses, valid_from, valid_to, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      p.code,
      p.kind,
      p.value,
      p.max_uses,
      p.valid_from,
      p.valid_to,
      p.is_active,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(msg)) return { ok: false, error: "code-taken" };
    console.error("[admin/promos] create error:", err);
    return { ok: false, error: "db-error" };
  }
  revalidatePath(`/${locale}/admin/promos`);
  redirect(`/${locale}/admin/promos`);
}

export async function updatePromo(
  rawLocale: string,
  id: number,
  _prev: PromosResult | undefined,
  formData: FormData,
): Promise<PromosResult> {
  const locale = await requireStaff(rawLocale);
  const p = parse(formData);
  if (!p.code || p.value <= 0) return { ok: false, error: "required" };
  try {
    await execute(
      `UPDATE promo_codes SET code = ?, kind = ?, value = ?, max_uses = ?,
         valid_from = ?, valid_to = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      p.code,
      p.kind,
      p.value,
      p.max_uses,
      p.valid_from,
      p.valid_to,
      p.is_active,
      id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(msg)) return { ok: false, error: "code-taken" };
    console.error("[admin/promos] update error:", err);
    return { ok: false, error: "db-error" };
  }
  revalidatePath(`/${locale}/admin/promos`);
  return { ok: true };
}

export async function deletePromo(
  rawLocale: string,
  id: number,
): Promise<PromosResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM promo_codes WHERE id = ?`, id);
  revalidatePath(`/${locale}/admin/promos`);
  return { ok: true };
}
