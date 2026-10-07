/**
 * Server Action pública: crear una reserva con flujo de pago primero.
 *
 * Flujo nuevo (payment-first):
 * 1. El cliente elige método de pago ANTES de enviar el formulario:
 *    - "cash": crea la reserva directamente (comportamiento actual).
 *    - "paypal": crea orden de PayPal, redirige al cliente. La reserva
 *      se crea SOLO tras capturar el pago en `/api/paypal/capture-order`.
 *
 * El método de pago es OBLIGATORIO: si no llega "cash" o "paypal", la
 * solicitud se rechaza y NO se crea ninguna reserva.
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
  getInternalRecipients,
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
      /** Si paymentMethod === "paypal", contiene el ID de la orden para redirigir. */
      paypalOrderId?: string;
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

/**
 * Crea una reserva con el método de pago elegido.
 *
 * - paymentMethod === "cash": crea la reserva ya, devuelve referencia y WhatsApp.
 * - paymentMethod === "paypal": crea orden de PayPal, devuelve paypalOrderId para redirigir.
 *   La reserva se crea en `/api/paypal/capture-order` tras capturar el pago.
 * - Sin paymentMethod: se rechaza con "validation.paymentMethodRequired".
 */
export async function bookTour(
  locale: Locale,
  _prevState: BookTourResult | undefined,
  formData: FormData,
): Promise<BookTourResult> {
  // Honeypot anti-spam
  const website = formData.get("website");
  if (typeof website === "string" && website.trim() !== "") {
    return { ok: false, errors: { form: "validation.serverError" } };
  }

  // Validar método de pago
  const paymentMethod = formData.get("paymentMethod");
  if (paymentMethod !== "cash" && paymentMethod !== "paypal") {
    return { ok: false, errors: { paymentMethod: "validation.paymentMethodRequired" } };
  }

  const parsed = bookingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, errors: zodErrors(parsed.error) };
  }
  const data: BookingFormData = parsed.data;

  // Requiere sesión
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

  // --- CASO PAYPAL: crear orden y redirigir ---
  if (paymentMethod === "paypal") {
    const { getPayPalConfig, createPayPalOrder } = await import("@/lib/payments/paypal");
    const paypalConfig = await getPayPalConfig();
    if (!paypalConfig) {
      return { ok: false, errors: { form: "validation.paypalNotConfigured" } };
    }

    // Calcular precio (reutiliza createBooking para validar disponibilidad y precio)
    // Pero NO guardamos la reserva aún. Usamos quoteBooking para obtener el precio.
    const { quoteBooking } = await import("@/lib/db/bookings");
    const quote = await quoteBooking({
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

    const amount = quote.depositDue > 0 ? quote.depositDue : quote.totalPrice;
    if (!(amount > 0)) {
      // Si no hay nada que cobrar, tratamos como cash
      return createBookingDirect(data, locale, session.user.id, clientIp);
    }

    try {
      const { id: paypalOrderId } = await createPayPalOrder(paypalConfig, {
        amount,
        currency: quote.currency,
        reference: `pending-${Date.now()}`, // referencia temporal
        description: `Reserva ${data.kind} · ${data.tourSlug || data.transferRouteId || "custom"}`,
      });

      // Guardar datos de la reserva pendiente en sesión/cookie para recuperarlos en capture
      // Usamos el orderId de PayPal como clave temporal
      const { setPendingBooking } = await import("@/lib/db/pending-booking");
      await setPendingBooking(paypalOrderId, {
        data,
        locale,
        userId: session.user.id,
        clientIp,
        amount,
        currency: quote.currency,
        totalPrice: quote.totalPrice,
        depositDue: quote.depositDue,
      });

      return { ok: true, paypalOrderId, reference: "", total: amount, whatsappUrl: "", email: "", currency: quote.currency, depositDue: quote.depositDue, canPayDeposit: true };
    } catch (err) {
      console.error("[bookTour] error creando orden PayPal:", err);
      return { ok: false, errors: { form: "validation.paypalError" } };
    }
  }

  // --- CASO CASH: crear reserva directa ---
  return createBookingDirect(data, locale, session.user.id, clientIp);
}

async function createBookingDirect(
  data: BookingFormData,
  locale: Locale,
  userId: number,
  clientIp: string | null,
): Promise<BookTourResult> {
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
      userId,
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

  // Correos
  try {
    await sendBookingEmails(booking.id, locale, experience);
  } catch (err) {
    console.error("[bookTour] fallo enviando correos:", err);
  }

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

export async function sendBookingEmails(
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

  const recipients = await getInternalRecipients();
  if (recipients.length > 0) {
    await sendEmail({
      to: recipients,
      subject: `Nueva reserva web ${booking.reference} · ${experience}`,
      html: emailLayout(
        `Nueva reserva ${booking.reference}`,
        `<p style="font-size:14px;color:#334155;">Tel: ${booking.customer_phone} · Email: ${booking.customer_email}</p>` +
          rows,
      ),
      replyTo: booking.customer_email,
      copyToInternal: false,
    });
  }
}