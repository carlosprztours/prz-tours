/**
 * POST /api/stripe/checkout — crea la sesión de pago del anticipo.
 *
 * Body JSON: { reference, email }. Verifica que la referencia y el email
 * coincidan (para no dejar pagar reservas ajenas) y devuelve la URL de
 * Stripe Checkout.
 */
import { NextResponse, type NextRequest } from "next/server";

import { getBookingByReference } from "@/lib/db/bookings";
import { createDepositSession } from "@/lib/payments/stripe";

export async function POST(request: NextRequest) {
  let body: { reference?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const reference = (body.reference ?? "").trim().toUpperCase();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!reference || !email) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const booking = await getBookingByReference(reference);
  if (
    !booking ||
    booking.customer_email.toLowerCase() !== email ||
    booking.deposit_due <= 0 ||
    booking.deposit_paid >= booking.deposit_due
  ) {
    return NextResponse.json({ error: "not-eligible" }, { status: 409 });
  }

  const origin = request.nextUrl.origin;
  // Locale de la reserva para volver al idioma correcto.
  const locale = booking.locale === "en" ? "en" : "es";

  try {
    const { url } = await createDepositSession(booking, locale, origin);
    if (!url) return NextResponse.json({ error: "disabled" }, { status: 503 });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[stripe] checkout error:", err);
    return NextResponse.json({ error: "stripe-error" }, { status: 502 });
  }
}
