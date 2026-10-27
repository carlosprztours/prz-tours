import { NextResponse, type NextRequest } from "next/server";

import { getBookingByReference } from "@/lib/db/bookings";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  createPayPalOrder,
  getPayPalConfig,
} from "@/lib/payments/paypal";

export async function POST(request: NextRequest) {
  // 1) Exige sesión iniciada.
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "auth-required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { reference?: string } | null;
  const reference = body?.reference;
  if (!reference) return NextResponse.json({ error: "no-reference" }, { status: 400 });

  const [cfg, booking] = await Promise.all([
    getPayPalConfig(),
    getBookingByReference(reference.trim().toUpperCase()),
  ]);
  if (!cfg) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  if (!booking) return NextResponse.json({ error: "not-found" }, { status: 404 });

  // 2) Sólo el titular de la reserva (o staff) puede pagar por ella.
  if (
    booking.user_id !== session.user.id &&
    !["admin", "editor", "photographer"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 3) No volver a crear orden si ya está pagada.
  if (booking.payment_status === "paid") {
    return NextResponse.json({ error: "already-paid" }, { status: 409 });
  }

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
