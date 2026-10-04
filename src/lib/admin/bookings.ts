/**
 * Server Actions del panel: cambiar estado y pago de una reserva.
 *
 * Solo staff autenticado (verificado con `verifySession`). Cada cambio queda
 * registrado en `booking_events` y actualiza el sello de tiempo
 * correspondiente (confirmed_at / completed_at / cancelled_at).
 */
"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { execute } from "@/lib/db/client";
import { getBookingById } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { BookingStatus, Locale, PaymentStatus } from "@/types";

const NEXT_STATUS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "pending"],
  completed: [],
  cancelled: ["pending"],
};

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function staffLocale(raw: string) {
  const locale: Locale = isLocale(raw) ? raw : "en";
  const session = await verifySession(locale);
  return { loc: locale, me: session.user.id, email: session.user.email };
}

export async function setBookingStatus(
  locale: string,
  bookingId: number,
  to: BookingStatus,
  actorNote?: string,
): Promise<AdminActionResult> {
  const { loc, me, email } = await staffLocale(locale);
  const booking = await getBookingById(bookingId);
  if (!booking) return { ok: false, error: "not-found" };

  if (!NEXT_STATUS[booking.status].includes(to)) {
    return { ok: false, error: "invalid-transition" };
  }

  const stamp =
    to === "confirmed"
      ? ", confirmed_at = datetime('now')"
      : to === "completed"
        ? ", completed_at = datetime('now')"
        : to === "cancelled"
          ? ", cancelled_at = datetime('now')"
          : "";

  await execute(
    `UPDATE bookings SET status = ?, updated_at = datetime('now')${stamp} WHERE id = ?`,
    to,
    bookingId,
  );
  await execute(
    `INSERT INTO booking_events (booking_id, from_status, to_status, note, actor)
     VALUES (?, ?, ?, ?, ?)`,
    bookingId,
    booking.status,
    to,
    actorNote ?? null,
    "staff",
  );

  revalidatePath(`/${loc}/admin/bookings`);
  revalidatePath(`/${loc}/admin`);
  const { logActivity } = await import("./activity");
  await logActivity(
    `booking.${to}`,
    `${booking.reference} (${booking.status} → ${to})`,
    me,
    email,
  );
  return { ok: true };
}

export async function setBookingPayment(
  locale: string,
  bookingId: number,
  payment: PaymentStatus,
): Promise<AdminActionResult> {
  const { loc, me, email } = await staffLocale(locale);
  const booking = await getBookingById(bookingId);
  if (!booking) return { ok: false, error: "not-found" };

  await execute(
    `UPDATE bookings SET payment_status = ?, updated_at = datetime('now') WHERE id = ?`,
    payment,
    bookingId,
  );
  await execute(
    `INSERT INTO booking_events (booking_id, from_status, to_status, note, actor)
     VALUES (?, ?, ?, ?, ?)`,
    bookingId,
    booking.status,
    booking.status,
    `Pago: ${payment}`,
    "staff",
  );

  revalidatePath(`/${loc}/admin/bookings`);
  revalidatePath(`/${loc}/admin`);
  const { logActivity } = await import("./activity");
  await logActivity(`booking.pay-${payment}`, booking.reference, me, email);
  return { ok: true };
}
