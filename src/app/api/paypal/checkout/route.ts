/**
 * POST /api/paypal/checkout — crea la orden de PayPal para una reserva
 * payment-first SIN abandonar la página.
 *
 * El formulario de reserva envía aquí los datos (JSON) cuando el cliente
 * elige PayPal y pulsa "Reservar y pagar con PayPal". El servidor:
 *  1. Valida los datos (mismo `bookingSchema` que la Server Action).
 *  2. Exige sesión iniciada (igual que la reserva).
 *  3. Cotiza el precio y crea la orden en PayPal.
 *  4. Guarda la reserva pendiente (30 min) asociada al orderId.
 *  5. Devuelve `{ id, clientId, mode, currency, amount }` para que el SDK
 *     de PayPal abra los botones en la misma página.
 *
 * La reserva real se crea en `/api/paypal/capture-order` (o en la vuelta
 * `/api/paypal/return`) tras capturar el pago.
 */
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { createBooking, quoteBooking } from "@/lib/db/bookings";
import { setPendingBooking } from "@/lib/db/pending-booking";
import { createPayPalOrder, getPayPalConfig } from "@/lib/payments/paypal";
import { bookingSchema } from "@/lib/validation/booking";
import type { Locale } from "@/types";

export async function POST(request: NextRequest) {
  // 1) Exige sesión ANTES de tocar nada.
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "auth-required" }, { status: 401 });
  }

  // 2) Body JSON plano (los mismos campos del formulario).
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  // Honeypot anti-spam (igual que la Server Action).
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ error: "invalid-body" }, { status: 422 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;

  if (data.paymentMethod !== "paypal") {
    return NextResponse.json({ error: "invalid-payment-method" }, { status: 422 });
  }

  if (data.kind === "tour" && !data.tourId) {
    return NextResponse.json({ error: "tour-required" }, { status: 422 });
  }
  if (data.kind === "transfer" && !data.transferRouteId) {
    return NextResponse.json({ error: "route-required" }, { status: 422 });
  }
  if (data.kind === "custom" && (!data.notes || data.notes.trim().length < 10)) {
    return NextResponse.json({ error: "custom-required" }, { status: 422 });
  }

  const locale: Locale = body.locale === "en" ? "en" : "es";
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  // 3) PayPal configurado.
  const cfg = await getPayPalConfig();
  if (!cfg) {
    return NextResponse.json({ error: "paypal-not-configured" }, { status: 503 });
  }

  // 4) Precio desde la BD (nunca se confía en lo que envía el formulario).
  let quote;
  try {
    quote = await quoteBooking({
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
      shipName: data.shipName,
      meetingPoint: data.meetingPoint,
      locale,
      notes: data.notes,
      source: "web",
      clientIp,
      userId: session.user.id,
    });
  } catch (err) {
    const code = err instanceof Error && "code" in err ? String((err as { code?: string }).code ?? "") : "";
    if (code === "sold-out") {
      return NextResponse.json({ error: "sold-out" }, { status: 409 });
    }
    if (code.startsWith("promo-")) {
      return NextResponse.json({ error: "promo-invalid" }, { status: 422 });
    }
    console.error("[paypal-checkout] fallo en quoteBooking:", err);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }

  const amount = quote.depositDue > 0 ? quote.depositDue : quote.totalPrice;

  // 5) Si no hay nada que cobrar, la reserva se crea directa (como efectivo).
  if (!(amount > 0)) {
    try {
      const booking = await createBooking({
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
        shipName: data.shipName,
        meetingPoint: data.meetingPoint,
        locale,
        notes: data.notes,
        source: "web",
        clientIp,
        userId: session.user.id,
      });
      const experience = booking.tour_title || booking.transfer_label || "";
      try {
        const { sendBookingEmails } = await import("@/lib/actions/book-tour");
        await sendBookingEmails(booking.id, locale, experience);
      } catch (err) {
        console.error("[paypal-checkout] fallo enviando correos:", err);
      }
      return NextResponse.json({ ok: true, reference: booking.reference });
    } catch (err) {
      console.error("[paypal-checkout] no se pudo crear la reserva directa:", err);
      return NextResponse.json({ error: "server-error" }, { status: 500 });
    }
  }

  // 6) Crear la orden (con return/cancel por si el SDK no está disponible).
  const origin = new URL(request.url).origin;
  const reference = `pending-${Date.now()}`;
  let orderId: string;
  try {
    const order = await createPayPalOrder(cfg, {
      amount,
      currency: quote.currency,
      reference,
      description: `Reserva ${data.kind} · ${data.tourSlug || data.transferRouteId || "custom"}`,
      returnUrl: `${origin}/api/paypal/return?locale=${locale}`,
      cancelUrl: `${origin}/api/paypal/return?locale=${locale}&cancelled=1`,
    });
    orderId = order.id;
  } catch (err) {
    console.error("[paypal-checkout] error creando orden PayPal:", err);
    return NextResponse.json({ error: "paypal-create-failed" }, { status: 502 });
  }

  // 7) Guardar la reserva pendiente (30 min) para consumirla al capturar.
  try {
    await setPendingBooking(orderId, {
      data,
      locale,
      userId: session.user.id,
      clientIp,
      amount,
      currency: quote.currency,
      totalPrice: quote.totalPrice,
      depositDue: quote.depositDue,
    });
  } catch (err) {
    console.error("[paypal-checkout] no se pudo guardar la pendiente:", err);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: orderId,
    clientId: cfg.clientId,
    mode: cfg.mode,
    currency: quote.currency,
    amount,
    depositDue: quote.depositDue,
    totalPrice: quote.totalPrice,
  });
}