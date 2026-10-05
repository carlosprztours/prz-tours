/**
 * POST /api/stripe/webhook — confirma pagos de Stripe.
 *
 * Verifica la firma con `STRIPE_WEBHOOK_SECRET`. Ante
 * `checkout.session.completed` con `metadata.booking_id`: marca el anticipo
 * como pagado, el pago como parcial (o total si cubre todo) y confirma la
 * reserva automáticamente. Todo idempotente: si ya estaba pagada, no repite.
 */
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { execute, queryOne } from "@/lib/db/client";
import { getEnvVar } from "@/lib/db/client";
import { getStripe } from "@/lib/payments/stripe";

export async function POST(request: NextRequest) {
  const client = await getStripe();
  const webhookSecret = await getEnvVar("STRIPE_WEBHOOK_SECRET");
  if (!client || !webhookSecret) {
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no-signature" }, { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe] bad signature:", err);
    return NextResponse.json({ error: "bad-signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = Number(session.metadata?.booking_id ?? 0);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ received: true });
  }

  const booking = await queryOne<{
    id: number;
    total_price: number;
    deposit_due: number;
    deposit_paid: number;
    status: string;
    payment_status: string;
  }>(
    `SELECT id, total_price, deposit_due, deposit_paid, status, payment_status
     FROM bookings WHERE id = ?`,
    bookingId,
  );
  if (!booking) return NextResponse.json({ received: true });

  const paidNow = (session.amount_total ?? 0) / 100;
  const depositPaid = Math.max(booking.deposit_paid, paidNow);
  const fullyPaid = depositPaid >= booking.total_price && booking.total_price > 0;
  const paymentStatus = fullyPaid ? "paid" : "partial";
  const newStatus = booking.status === "pending" ? "confirmed" : booking.status;

  await execute(
    `UPDATE bookings SET deposit_paid = ?, payment_status = ?, status = ?,
       confirmed_at = COALESCE(confirmed_at, CASE WHEN ? = 'confirmed' THEN datetime('now') END),
       stripe_session_id = ?, updated_at = datetime('now')
     WHERE id = ?`,
    depositPaid,
    paymentStatus,
    newStatus,
    newStatus,
    session.id,
    bookingId,
  );
  await execute(
    `INSERT INTO booking_events (booking_id, from_status, to_status, note, actor)
     VALUES (?, ?, ?, ?, 'stripe')`,
    bookingId,
    booking.status,
    newStatus,
    `Anticipo pagado: $${paidNow}`,
  );

  // Aviso en la web: pago recibido (y confirmación si cambió el estado).
  try {
    const { notifyUser, resolveBookingUser } = await import("@/lib/db/loyalty");
    const full = await queryOne<{
      reference: string;
      user_id: number | null;
      customer_email: string;
      locale: string;
    }>(
      `SELECT reference, user_id, customer_email, locale FROM bookings WHERE id = ?`,
      bookingId,
    );
    if (full) {
      const owner = await resolveBookingUser(full);
      if (owner) {
        const bl = owner.locale;
        await notifyUser(
          owner.id,
          "payment",
          bl === "es"
            ? `Pago recibido · ${full.reference}`
            : `Payment received · ${full.reference}`,
          bl === "es"
            ? `Registramos $${paidNow} en tu reserva. ¡Gracias!`
            : `We registered $${paidNow} on your booking. Thank you!`,
          `/${bl}/account`,
        );
      }
    }
  } catch (err) {
    console.error("[stripe] notify error:", err);
  }

  return NextResponse.json({ received: true });
}
