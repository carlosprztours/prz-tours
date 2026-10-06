import { NextResponse, type NextRequest } from "next/server";

import { getBookingByReference, markBookingPaidByReference } from "@/lib/db/bookings";
import {
  capturePayPalOrder,
  getPayPalConfig,
} from "@/lib/payments/paypal";
import { sendBookingUpdateEmail } from "@/lib/notify/booking-email";

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

    const booking = await getBookingByReference(reference.trim().toUpperCase());
    await markBookingPaidByReference(reference.trim().toUpperCase());

    if (booking) {
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
