/**
 * Stripe: Checkout de anticipo + webhook.
 *
 * Flujo:
 * 1. La reserva se crea con `deposit_due` (>0 si el tour lo exige).
 * 2. El cliente pulsa "Pagar anticipo" → `createDepositCheckout()` crea una
 *    Checkout Session y devuelve su URL → redirección a Stripe.
 * 3. Stripe cobra y llama al webhook → se marca `deposit_paid`, pago
 *    `partial` (o `paid` si cubre el total) y la reserva pasa a `confirmed`.
 *
 * Sin `STRIPE_SECRET_KEY` todo esto se omite con elegancia: la reserva
 * funciona igual y el anticipo se cobra por otros medios.
 */
import "server-only";

import Stripe from "stripe";

import { getEnvVar } from "@/lib/db/client";

let stripe: Stripe | null | undefined;

export async function getStripe(): Promise<Stripe | null> {
  if (stripe !== undefined) return stripe;
  const key = await getEnvVar("STRIPE_SECRET_KEY");
  if (!key) {
    stripe = null;
    return null;
  }
  stripe = new Stripe(key);
  return stripe;
}

export async function isStripeEnabled(): Promise<boolean> {
  return (await getStripe()) !== null;
}

/** Crea la Checkout Session para el anticipo de una reserva. */
export async function createDepositSession(
  booking: {
    id: number;
    reference: string;
    tour_title: string;
    transfer_label: string | null;
    total_price: number;
    deposit_due: number;
    currency: string;
    customer_email: string;
  },
  locale: string,
  baseUrl: string,
): Promise<{ url: string | null }> {
  const client = await getStripe();
  if (!client || booking.deposit_due <= 0) return { url: null };

  const session = await client.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.customer_email || undefined,
    line_items: [
      {
        price_data: {
          currency: booking.currency.toLowerCase(),
          product_data: {
            name: `Anticipo · ${booking.tour_title || booking.transfer_label || booking.reference}`,
          },
          unit_amount: Math.round(booking.deposit_due * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { booking_id: String(booking.id), reference: booking.reference },
    success_url: `${baseUrl}/${locale}/book/success?ref=${booking.reference}`,
    cancel_url: `${baseUrl}/${locale}/track?ref=${booking.reference}`,
  });

  return { url: session.url };
}
