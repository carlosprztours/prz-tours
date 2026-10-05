/**
 * Server Actions del panel: cambiar estado y pago de una reserva.
 *
 * Solo staff autenticado (verificado con `verifySession`). Cada cambio queda
 * registrado en `booking_events` y actualiza el sello de tiempo
 * correspondiente (confirmed_at / completed_at / cancelled_at).
 */
"use server";

import { revalidatePath } from "next/cache";

import { requireStaffRoles } from "./access";
import { execute } from "@/lib/db/client";
import { getBookingById } from "@/lib/db/bookings";
import type { BookingStatus, PaymentStatus } from "@/types";

const NEXT_STATUS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "pending"],
  completed: [],
  cancelled: ["pending"],
};

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function staffLocale(raw: string) {
  const { locale, session } = await requireStaffRoles(raw, "admin", "editor");
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

  // Fidelidad y avisos: confirmar avisa; completar suma el viaje y,
  // cada 2 viajes, emite el cupón automático (con su aviso).
  if (to === "confirmed" || to === "completed") {
    try {
      const {
        handleTripCompleted,
        notifyUser,
        resolveBookingUser,
      } = await import("@/lib/db/loyalty");
      const owner = await resolveBookingUser(booking);
      if (owner) {
        const bl = owner.locale;
        const experience =
          booking.tour_title || booking.transfer_label || "";
        if (to === "confirmed") {
          await notifyUser(
            owner.id,
            "booking-confirmed",
            bl === "es"
              ? `Reserva ${booking.reference} confirmada`
              : `Booking ${booking.reference} confirmed`,
            bl === "es"
              ? `Tu experiencia "${experience}" está confirmada. ¡Te esperamos!`
              : `Your experience "${experience}" is confirmed. See you soon!`,
            `/${bl}/account`,
            bl,
          );

          // Correo al cliente, con copia oculta al buzón del dominio y al
          // personal, para que quede constancia de la reserva confirmada.
          const { sendBookingUpdateEmail } = await import("@/lib/notify/booking-email");
          await sendBookingUpdateEmail(booking, "confirmed", bl).catch(() => false);
        } else {
          const coupon = await handleTripCompleted(owner.id);
          if (!coupon) {
            await notifyUser(
              owner.id,
              "trip-completed",
              bl === "es" ? "¡Gracias por viajar con nosotros!" : "Thanks for travelling with us!",
              bl === "es"
                ? `Tu viaje ${booking.reference} quedó registrado. Cada 2 viajes recibes un 10 % de descuento.`
                : `Your trip ${booking.reference} was recorded. Every 2 trips you earn 10 % off.`,
              `/${bl}/account`,
              bl,
            );
          }
        }
      }
    } catch (err) {
      console.error("[bookings] loyalty/notify error:", err);
    }
  }

  // Cancelar: avisamos al cliente (web + push + correo) para que no se entere tarde.
  if (to === "cancelled") {
    try {
      const { notifyUser, resolveBookingUser } = await import("@/lib/db/loyalty");
      const owner = await resolveBookingUser(booking);
      if (owner) {
        const bl = owner.locale;
        await notifyUser(
          owner.id,
          "booking-cancelled",
          bl === "es"
            ? `Reserva ${booking.reference} cancelada`
            : `Booking ${booking.reference} cancelled`,
          bl === "es"
            ? "Tu reserva fue cancelada. Si no fuiste tú, escríbenos."
            : "Your booking was cancelled. If it wasn't you, get in touch.",
          `/${bl}/account`,
          bl,
        );

        // Correo al cliente (con copia oculta a los internos) para que la
        // cancelacion quede registrada y no se entere tarde.
        const { sendBookingUpdateEmail } = await import("@/lib/notify/booking-email");
        await sendBookingUpdateEmail(booking, "cancelled", bl).catch(() => false);
      }
    } catch (err) {
      console.error("[bookings] cancel notify error:", err);
    }
  }
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

  if (payment === "paid" || payment === "partial") {
    try {
      const { notifyUser, resolveBookingUser } = await import("@/lib/db/loyalty");
      const owner = await resolveBookingUser(booking);
      if (owner) {
        const bl = owner.locale;
        await notifyUser(
          owner.id,
          "payment",
          bl === "es"
            ? `Pago registrado · ${booking.reference}`
            : `Payment recorded · ${booking.reference}`,
          bl === "es"
            ? payment === "paid"
              ? "Tu reserva quedó totalmente pagada. ¡Gracias!"
              : "Registramos un pago parcial en tu reserva. ¡Gracias!"
            : payment === "paid"
              ? "Your booking is fully paid. Thank you!"
              : "We recorded a partial payment on your booking. Thank you!",
          `/${bl}/account`,
          bl,
        );

        // Correo de recibo (con copia oculta a los internos).
        const { sendBookingUpdateEmail } = await import("@/lib/notify/booking-email");
        await sendBookingUpdateEmail(
          booking,
          payment === "paid" ? "paid" : "partial",
          bl,
        ).catch(() => false);
      }
    } catch (err) {
      console.error("[bookings] payment notify error:", err);
    }
  }
  return { ok: true };
}
