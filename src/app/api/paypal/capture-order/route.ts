import { NextResponse, type NextRequest } from "next/server";

import { getBookingByReference, markBookingPaidByReference } from "@/lib/db/bookings";
import { consumePendingBooking } from "@/lib/db/pending-booking";
import {
  capturePayPalOrder,
  getPayPalConfig,
} from "@/lib/payments/paypal";
import { sendBookingUpdateEmail } from "@/lib/notify/booking-email";
import type { Locale } from "@/types";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { orderID?: string; reference?: string }
    | null;
  const orderID = body?.orderID;
  const reference = body?.reference;
  if (!orderID || !reference) {
    return NextResponse.json({ error: "missing-data" }, { status: 400 });
  }

  const cfg = await getPayPalConfig();
  if (!cfg) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  try {
    const { status } = await capturePayPalOrder(cfg, orderID);
    if (status !== "COMPLETED") {
      return NextResponse.json({ ok: false, status }, { status: 402 });
    }

    // --- NUEVO FLUJO: consumir reserva pendiente y crear la real ---
    const pending = await consumePendingBooking(orderID);
    if (pending) {
      const { createBooking } = await import("@/lib/db/bookings");
      const { sendBookingEmails } = await import("@/lib/actions/book-tour");

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
        return NextResponse.json({ error: "booking-creation-failed" }, { status: 500 });
      }

      // Marcar como pagada
      await markBookingPaidByReference(booking.reference);

      // Enviar correos de confirmación
      const experience = booking.tour_title || booking.transfer_label || "";
      try {
        await sendBookingEmails(booking.id, pending.locale as Locale, experience);
      } catch (err) {
        console.error("[paypal-capture] fallo enviando correos:", err);
      }

      // Aviso interno (buzón dominio + personal)
      const { getInternalRecipients } = await import("@/lib/notify/email");
      const recipients = await getInternalRecipients();
      if (recipients.length > 0) {
        const { definitionRow, emailLayout } = await import("@/lib/notify/email");
        const es = pending.locale === "es";
        const rows = [
          definitionRow(es ? "Referencia" : "Reference", booking.reference),
          definitionRow(es ? "Experiencia" : "Experience", experience || "-"),
          booking.booked_for
            ? definitionRow(es ? "Fecha" : "Date", booking.booked_for)
            : "",
          definitionRow(es ? "Personas" : "Guests", String(booking.guests)),
          booking.hotel
            ? definitionRow(es ? "Hotel" : "Hotel", booking.hotel)
            : "",
          definitionRow(es ? "Nombre" : "Name", booking.customer_name),
          definitionRow(
            es ? "Total estimado" : "Estimated total",
            `$${booking.total_price} ${booking.currency}`,
          ),
        ].join("");

        const { sendEmail } = await import("@/lib/notify/email");
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

      // Correo de "pagado" al cliente
      try {
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
        console.error("[paypal] no se pudo enviar el correo de pago:", err);
      }

      return NextResponse.json({ ok: true, reference: booking.reference });
    }

    // --- FLUJO LEGACY: si no hay pending, buscar por referencia ---
    const booking = await getBookingByReference(reference.trim().toUpperCase());
    if (booking) {
      await markBookingPaidByReference(reference.trim().toUpperCase());

      try {
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
        console.error("[paypal] no se pudo enviar el correo de pago:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[paypal] fallo al capturar:", err);
    return NextResponse.json({ error: "capture-failed" }, { status: 502 });
  }
}