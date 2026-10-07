/**
 * Captura y finalización de órdenes PayPal para el flujo payment-first.
 *
 * El flujo nuevo (pago antes de crear la reserva) guarda una fila en
 * `pending_bookings` con los datos del cliente, clave `paypalOrderId`.
 * Tras capturar el pago se consume esa fila y se crea la reserva real.
 *
 * Este helper lo comparten:
 * - `POST /api/paypal/capture-order`  (SDK de PayPal en la página de reserva)
 * - `GET  /api/paypal/return`         (vuelta tras redirección sin JS)
 */
import "server-only";

import type { Locale } from "@/types";
import { capturePayPalOrder, getPayPalConfig } from "./paypal";
import { consumePendingBooking } from "@/lib/db/pending-booking";

export type CaptureResult =
  | { ok: true; reference: string }
  | { ok: false; error: string };

/**
 * Tras una captura COMPLETADA, consume la reserva pendiente y crea la reserva
 * real (marcada como pagada) con sus correos. Devuelve la referencia.
 */
export async function finishPendingBooking(orderId: string): Promise<CaptureResult> {
  const { createBooking } = await import("@/lib/db/bookings");
  const pending = await consumePendingBooking(orderId);
  if (!pending) return { ok: false, error: "pending-not-found" };

  let booking;
  try {
    booking = await createBooking({
      kind: pending.data.kind,
      tourId: pending.data.tourId,
      tourSlug: pending.data.tourSlug,
      transferRouteId: pending.data.transferRouteId,
      promoCode: pending.data.promoCode,
      customerName: pending.data.customerName,
      customerEmail: pending.data.customerEmail,
      customerPhone: pending.data.customerPhone,
      customerCountry: pending.data.customerCountry,
      guests: pending.data.guests,
      bookedFor: pending.data.bookedFor,
      pickupTime: pending.data.pickupTime,
      hotel: pending.data.hotel,
      airport: pending.data.airport,
      cruisePort: pending.data.cruisePort,
      meetingPoint: pending.data.meetingPoint,
      locale: pending.locale as Locale,
      notes: pending.data.notes,
      source: "web",
      clientIp: pending.clientIp,
      userId: pending.userId,
    });
  } catch (err) {
    console.error("[paypal-capture] no se pudo crear la reserva:", err);
    return { ok: false, error: "booking-creation-failed" };
  }

  // Marcar como pagada
  try {
    const { markBookingPaidByReference } = await import("@/lib/db/bookings");
    await markBookingPaidByReference(booking.reference);
  } catch (err) {
    console.error("[paypal-capture] no se pudo marcar como pagada:", err);
  }

  const es = pending.locale === "es";
  const experience = booking.tour_title || booking.transfer_label || "";

  // Correos de confirmación (cliente + interno)
  try {
    const { sendBookingEmails } = await import("@/lib/actions/book-tour");
    await sendBookingEmails(booking.id, pending.locale as Locale, experience);
  } catch (err) {
    console.error("[paypal-capture] fallo enviando correos:", err);
  }

  // Aviso interno (buzón dominio + personal)
  try {
    const { getBookingNotifyRecipients } = await import("@/lib/notify/email");
    const recipients = await getBookingNotifyRecipients();
    if (recipients.length > 0) {
      const { definitionRow, emailLayout, sendEmail } = await import("@/lib/notify/email");
      const rows = [
        definitionRow(es ? "Referencia" : "Reference", booking.reference),
        definitionRow(es ? "Experiencia" : "Experience", experience || "-"),
        booking.booked_for
          ? definitionRow(es ? "Fecha" : "Date", booking.booked_for)
          : "",
        definitionRow(es ? "Personas" : "Guests", String(booking.guests)),
        booking.hotel ? definitionRow(es ? "Hotel" : "Hotel", booking.hotel) : "",
        definitionRow(es ? "Nombre" : "Name", booking.customer_name),
        definitionRow(
          es ? "Total estimado" : "Estimated total",
          `$${booking.total_price} ${booking.currency}`,
        ),
      ].join("");

      await sendEmail({
        to: recipients,
        subject: `Nueva reserva web ${booking.reference} · ${experience}`,
        html: emailLayout(
          `Nueva reserva ${booking.reference}`,
          `<p style="font-size:14px;color:#334155;">Tel: ${booking.customer_phone} · Email: ${booking.customer_email}</p>` + rows,
        ),
        replyTo: booking.customer_email,
        copyToInternal: false,
      });
    }
  } catch (err) {
    console.error("[paypal-capture] fallo enviando aviso interno:", err);
  }

  // Correo de "pagado" al cliente
  try {
    const { sendBookingUpdateEmail } = await import("@/lib/notify/booking-email");
    await sendBookingUpdateEmail(
      {
        reference: booking.reference,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        tour_title: booking.tour_title,
        transfer_label: booking.transfer_label,
        booked_for: booking.booked_for,
        pickup_time: booking.pickup_time,
        guests: booking.guests,
        total_price: booking.total_price,
        currency: booking.currency,
      },
      "paid",
      (booking.locale as "es" | "en") ?? "es",
    );
  } catch (err) {
    console.error("[paypal-capture] no se pudo enviar el correo de pago:", err);
  }

  return { ok: true, reference: booking.reference };
}

/**
 * Captura la orden en PayPal y, si quedó COMPLETED, finaliza la reserva
 * pendiente. Se usa en la vuelta tras la redirección (flujo sin JS).
 */
export async function captureAndFinishPendingBooking(orderId: string): Promise<CaptureResult> {
  const cfg = await getPayPalConfig();
  if (!cfg) return { ok: false, error: "not-configured" };

  let status: string;
  try {
    ({ status } = await capturePayPalOrder(cfg, orderId));
  } catch (err) {
    console.error("[paypal-capture] fallo al capturar:", err);
    return { ok: false, error: "capture-failed" };
  }
  if (status !== "COMPLETED") {
    return { ok: false, error: "not-completed" };
  }
  return finishPendingBooking(orderId);
}