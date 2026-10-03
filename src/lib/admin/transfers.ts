/**
 * Server Actions de rutas de traslado (staff).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { execute, query, queryOne } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import type { Locale, TransferRoute } from "@/types";

export type TransfersResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  await verifySession(locale);
  return locale;
}

export async function listAdminRoutes(rawLocale: string): Promise<TransferRoute[]> {
  await requireStaff(rawLocale);
  return query<TransferRoute>(`SELECT * FROM transfer_routes ORDER BY sort_order ASC, id ASC`);
}

export async function getAdminRoute(
  rawLocale: string,
  id: number,
): Promise<TransferRoute | null> {
  await requireStaff(rawLocale);
  return queryOne<TransferRoute>(`SELECT * FROM transfer_routes WHERE id = ?`, id);
}

function parse(form: FormData) {
  return {
    origin_key: String(form.get("origin_key") ?? "").trim().toUpperCase().slice(0, 8) || "XXX",
    origin_label: String(form.get("origin_label") ?? "").trim(),
    origin_airport: String(form.get("origin_airport") ?? "").trim() || null,
    destination: String(form.get("destination") ?? "").trim(),
    price_1_5: Math.max(0, Number(form.get("price_1_5")) || 0),
    price_6_11: Math.max(0, Number(form.get("price_6_11")) || 0),
    price_note: String(form.get("price_note") ?? "").trim() || null,
    sort_order: Math.round(Number(form.get("sort_order")) || 0),
    is_published: form.get("is_published") === "on" ? 1 : 0,
  };
}

export async function createRoute(
  rawLocale: string,
  _prev: TransfersResult | undefined,
  formData: FormData,
): Promise<TransfersResult> {
  const locale = await requireStaff(rawLocale);
  const r = parse(formData);
  if (!r.origin_label || !r.destination) return { ok: false, error: "required" };

  await execute(
    `INSERT INTO transfer_routes
       (origin_key, origin_label, origin_airport, destination, price_1_5, price_6_11, price_note, sort_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.origin_key,
    r.origin_label,
    r.origin_airport,
    r.destination,
    r.price_1_5,
    r.price_6_11,
    r.price_note,
    r.sort_order,
    r.is_published,
  );
  revalidatePath(`/${locale}/transfers`);
  redirect(`/${locale}/admin/transfers`);
}

export async function updateRoute(
  rawLocale: string,
  id: number,
  _prev: TransfersResult | undefined,
  formData: FormData,
): Promise<TransfersResult> {
  const locale = await requireStaff(rawLocale);
  const r = parse(formData);
  if (!r.origin_label || !r.destination) return { ok: false, error: "required" };

  await execute(
    `UPDATE transfer_routes SET origin_key = ?, origin_label = ?, origin_airport = ?,
       destination = ?, price_1_5 = ?, price_6_11 = ?, price_note = ?,
       sort_order = ?, is_published = ? WHERE id = ?`,
    r.origin_key,
    r.origin_label,
    r.origin_airport,
    r.destination,
    r.price_1_5,
    r.price_6_11,
    r.price_note,
    r.sort_order,
    r.is_published,
    id,
  );
  revalidatePath(`/${locale}/transfers`);
  revalidatePath(`/${locale}/admin/transfers`);
  return { ok: true };
}

export async function deleteRoute(
  rawLocale: string,
  id: number,
): Promise<TransfersResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM transfer_routes WHERE id = ?`, id);
  revalidatePath(`/${locale}/transfers`);
  revalidatePath(`/${locale}/admin/transfers`);
  return { ok: true };
}
