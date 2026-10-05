/**
 * Server Action pública: crear una reserva desde el formulario.
 *
 * 1. Valida con zod (nunca confía en el cliente).
 * 2. Calcula el precio desde la BD (`quoteBooking`).
 * 3. Guarda la reserva en D1 con estado `pending`.
 * 4. Intenta avisar por email (al cliente y al negocio). Si el correo falla,
 *    la reserva YA está guardada: nunca se pierde.
 * 5. Devuelve la referencia y la URL de WhatsApp para que el cliente confirme.
 */
"use server";

import { headers } from "next/headers";

import { createBooking, markBookingNotified } from "@/lib/db/bookings";
import { getSetting } from "@/lib/db/content";
import { DEFAULT_WHATSAPP } from "@/lib/site";
import {
  bookingSchema,
  formDataToObject,
  type BookingFormData,
} from "@/lib/validation/booking";
import {
  definitionRow,
  emailLayout,
  sendEmail,
} from "@/lib/notify/email";
import {
  bookingConfirmationMessage,
  whatsappLink,
} from "@/lib/notify/whatsapp";
import type { Locale } from "@/types";

export type BookTourResult =
  | {
      ok: true;
      reference: string;
      total: number;
      whatsappUrl: string;
      email: string;
      currency: string;
      depositDue: number;
      canPayDeposit: boolean;
    }
  | {
      ok: false;
      errors: Record<string, string>;
    };

function zodErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (error && typeof error === "object" && "issues" in error) {
    for (const issue of (error as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      const key = String(issue.path[0] ?? "form");
      if (!out[key]) out[key] = issue.message;
    }
  }
  return out;
}

export async function bookTour(
  locale: Locale,
  _prevState: BookTourResult | undefined,
  formData: FormData,
): Promise<BookTourResult> {
  const parsed = bookingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, errors: zodErrors(parsed.error) };
  }
  const data: BookingFormData = parsed.data;

  // Reservar exige cuenta: el formulario avisa con el modal de login,
  // pero esto lo garantiza aunque se intente saltar el cliente.
  const { getCurrentUser } = await import("@/lib/auth/dal");
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return { ok: false, errors: { form: "validation.authRequired" } };
  }

  if (data.kind === "tour" && !data.tourId) {
    return { ok: false, errors: { tourId: "validation.tourRequired" } };
  }
  if (data.kind === "transfer" && !data.transferRouteId) {
    return { ok: false, errors: { transferRouteId: "validation.routeRequired" } };
  }
  if (data.kind === "custom" && (!data.notes || data.notes.trim().length < 10)) {
    return { ok: false, errors: { notes: "validation.customRequired" } };
  }

  const headerList = await headers();
  const clientIp =
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  let booking;
  try {
    booking = await createBooking({
      kind: data.kind,
      tourId: data.tourId,
      tourSlug: data.tourSlug,
      transferRouteId: data.transferRouteId,
      promoCode: data.promoCode,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerCountry: data.customerCountry,
      guests: data.guests,
      bookedFor: data.bookedFor,
      pickupTime: data.pickupTime,
      hotel: data.hotel,
      airport: data.airport,
      cruisePort: data.cruisePort,
      meetingPoint: data.meetingPoint,
      locale,
      notes: data.notes,
      source: "web",
      clientIp,
      userId: session.user.id,
    });
  } catch (err) {
    console.error("[bookTour] no se pudo crear la reserva:", err);
    const code = err instanceof Error && "code" in err ? String((err as { code?: string }).code ?? "") : "";
    if (code === "sold-out") {
      return { ok: false, errors: { bookedFor: "validation.soldOut" } };
    }
    if (code.startsWith("promo-")) {
      return { ok: false, errors: { promoCode: "validation.promoInvalid" } };
    }
    return { ok: false, errors: { form: "validation.serverError" } };
  }

  // WhatsApp del negocio (editable desde el panel vía ajustes).
  // Si D1 falla aquí la reserva YA existe: se usa el fallback y se avisa
  // en el log en vez de mostrar un 500 que invite a duplicar la reserva.
  const businessWhatsapp = await getSetting("whatsapp", DEFAULT_WHATSAPP).catch(
    (err) => {
      console.error("[bookTour] getSetting whatsapp error:", err);
      return DEFAULT_WHATSAPP;
    },
  );
  const experience = booking.tour_title || booking.transfer_label || "";
  const whatsappUrl = whatsappLink(
    businessWhatsapp,
    bookingConfirmationMessage(
      {
        reference: booking.reference,
        tourTitle: booking.tour_title || undefined,
        transferLabel: booking.transfer_label || undefined,
        date: booking.booked_for,
        guests: booking.guests,
        name: booking.customer_name,
        total: booking.total_price,
        currency: booking.currency,
      },
      locale,
    ),
  );

  // Emails en segundo plano: no bloquean la respuesta si fallan.
  sendBookingEmails(booking.id, locale, experience).catch((err) =>
    console.error("[bookTour] fallo enviando correos:", err),
  );

  const { isStripeEnabled } = await import("@/lib/payments/stripe");
  const canPayDeposit =
    booking.deposit_due > 0 && (await isStripeEnabled().catch(() => false));

  return {
    ok: true,
    reference: booking.reference,
    total: booking.total_price,
    whatsappUrl,
    email: booking.customer_email,
    currency: booking.currency,
    depositDue: booking.deposit_due,
    canPayDeposit,
  };
}

async function sendBookingEmails(
  bookingId: number,
  locale: Locale,
  experience: string,
): Promise<void> {
  const { getBookingById } = await import("@/lib/db/bookings");
  const booking = await getBookingById(bookingId);
  if (!booking) return;

  const es = locale === "es";
  const rows = [
    definitionRow(es ? "Referencia" : "Reference", booking.reference),
    definitionRow(es ? "Experiencia" : "Experience", experience || "-"),
    booking.booked_for
      ? definitionRow(es ? "Fecha" : "Date", booking.booked_for)
      : "",
    definitionRow(
      es ? "Personas" : "Guests",
      String(booking.guests),
    ),
    booking.hotel
      ? definitionRow(es ? "Hotel" : "Hotel", booking.hotel)
      : "",
    booking.cruise_port
      ? definitionRow(
          es ? "Terminal de cruceros" : "Cruise terminal",
          booking.cruise_port,
        )
      : "",
    definitionRow(es ? "Nombre" : "Name", booking.customer_name),
    definitionRow(
      es ? "Total estimado" : "Estimated total",
      `$${booking.total_price} ${booking.currency}`,
    ),
  ].join("");

  // 1) Confirmación al cliente
  const customerTitle = es ? "Recibimos tu solicitud" : "We received your request";
  const customerIntro = es
    ? `<p style="font-size:14px;color:#334155;">Hola ${booking.customer_name}, gracias por reservar con Perez Tours. Este es el resumen de tu solicitud; te confirmaremos por WhatsApp en breve.</p>`
    : `<p style="font-size:14px;color:#334155;">Hi ${booking.customer_name}, thanks for booking with Perez Tours. Here is a summary of your request; we'll confirm on WhatsApp shortly.</p>`;
  const customerResult = await sendEmail({
    to: booking.customer_email,
    subject: `${customerTitle} · ${booking.reference}`,
    html: emailLayout(`${customerTitle} · ${booking.reference}`, customerIntro + rows),
  });
  if (customerResult.sent) await markBookingNotified(booking.id, "email");

  // 2) Aviso interno al negocio (la clave `email` es el correo del negocio).
  const notifyEmail = await getSetting("email", "");
  if (notifyEmail) {
    await sendEmail({
      to: notifyEmail,
      subject: `Nueva reserva web ${booking.reference} · ${experience}`,
      html: emailLayout(
        `Nueva reserva ${booking.reference}`,
        `<p style="font-size:14px;color:#334155;">Tel: ${booking.customer_phone} · Email: ${booking.customer_email}</p>` +
          rows,
      ),
      replyTo: booking.customer_email,
    });
  }
}
