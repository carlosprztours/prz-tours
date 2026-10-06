import { NextResponse, type NextRequest } from "next/server";

import { getBookingByReference } from "@/lib/db/bookings";
import {
  createPayPalOrder,
  getPayPalConfig,
} from "@/lib/payments/paypal";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { reference?: string } | null;
  const reference = body?.reference;
  if (!reference) return NextResponse.json({ error: "no-reference" }, { status: 400 });

  const [cfg, booking] = await Promise.all([
    getPayPalConfig(),
    getBookingByReference(reference.trim().toUpperCase()),
  ]);
  if (!cfg) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  if (!booking) return NextResponse.json({ error: "not-found" }, { status: 404 });

  // Cobra el anticipo si existe; si no, el total estimado.
  const amount = booking.deposit_due > 0 ? booking.deposit_due : booking.total_price;
  if (!(amount > 0)) return NextResponse.json({ error: "nothing-to-charge" }, { status: 400 });

  try {
    const { id } = await createPayPalOrder(cfg, {
      amount,
      currency: booking.currency ?? "USD",
      reference: booking.reference,
      description: `${booking.tour_title || booking.transfer_label || "Reserva"} · ${booking.reference}`,
    });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[paypal] no se pudo crear la orden:", err);
    return NextResponse.json({ error: "create-failed" }, { status: 502 });
  }
}
