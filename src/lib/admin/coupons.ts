/**
 * Server Actions de cupones personales (staff).
 *
 * Crear (con envío opcional por correo), reenviar por correo y cancelar.
 * Ver reglas del programa en `lib/db/loyalty.ts`.
 */
"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { execute, query, queryOne } from "@/lib/db/client";
import {
  issueCoupon,
  sendCouponEmail,
  type Coupon,
} from "@/lib/db/loyalty";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

export type CouponsResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  await verifySession(locale);
  return locale;
}

export type AdminCouponRow = Coupon & { owner_email: string; owner_name: string };

export async function listAdminCoupons(
  rawLocale: string,
): Promise<AdminCouponRow[]> {
  await requireStaff(rawLocale);
  return query<AdminCouponRow>(
    `SELECT c.*, u.email AS owner_email, u.name AS owner_name
     FROM coupons c JOIN users u ON u.id = c.user_id
     ORDER BY c.id DESC LIMIT 200`,
  );
}

/**
 * Crea un cupón manual para un usuario (por email). Si la cuenta ya tiene
 * un cupón activo, se rechaza (máximo 1 por cuenta).
 */
export async function createManualCoupon(
  rawLocale: string,
  _prev: CouponsResult | undefined,
  formData: FormData,
): Promise<CouponsResult> {
  const locale = await requireStaff(rawLocale);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const value = Math.min(90, Math.max(1, Number(formData.get("value")) || 10));
  const days = Math.min(365, Math.max(1, Math.round(Number(formData.get("days")) || 90)));
  const send = formData.get("send") === "on";
  if (!email.includes("@")) return { ok: false, error: "bad-email" };

  const user = await queryOne<{ id: number }>(
    `SELECT id FROM users WHERE email = ?`,
    email,
  );
  if (!user) return { ok: false, error: "no-user" };

  const { activeCouponFor } = await import("@/lib/db/loyalty");
  if (await activeCouponFor(user.id)) {
    return { ok: false, error: "has-active" };
  }

  try {
    await issueCoupon({
      userId: user.id,
      reason: "manual",
      value,
      expiresInDays: days,
      sendEmail: send,
      locale,
    });
  } catch (err) {
    console.error("[admin] createManualCoupon error:", err);
    return { ok: false, error: "server" };
  }
  revalidatePath(`/${locale}/admin/coupons`);
  return { ok: true };
}

export async function resendCouponEmail(
  rawLocale: string,
  couponId: number,
): Promise<CouponsResult> {
  const locale = await requireStaff(rawLocale);
  const coupon = await queryOne<Coupon>(
    `SELECT * FROM coupons WHERE id = ?`,
    couponId,
  );
  if (!coupon || coupon.status !== "active") {
    return { ok: false, error: "not-found" };
  }
  const sent = await sendCouponEmail(coupon, locale).catch(() => false);
  return sent ? { ok: true } : { ok: false, error: "server" };
}

export async function cancelCoupon(
  rawLocale: string,
  couponId: number,
): Promise<CouponsResult> {
  const locale = await requireStaff(rawLocale);
  await execute(
    `UPDATE coupons SET status = 'cancelled' WHERE id = ? AND status = 'active'`,
    couponId,
  );
  revalidatePath(`/${locale}/admin/coupons`);
  return { ok: true };
}
