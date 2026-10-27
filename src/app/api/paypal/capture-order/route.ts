import { NextResponse, type NextRequest } from "next/server";

import { getBookingByReference } from "@/lib/db/bookings";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  capturePayPalOrder,
  getPayPalConfig,
} from "@/lib/payments/paypal";
import { finishPendingBooking } from "@/lib/payments/paypal-capture";
import { sendBookingUpdateEmail } from "@/lib/notify/booking-email";

/**
 * POST /api/paypal/capture-order — captura el pago tras la aprobación del
 * cliente (lo llama el SDK de PayPal en `onApprove`).
 *
 * Dos flujos:
 * - Payment-first (nuevo): el orderID tiene una reserva pendiente guardada;
 *   se consume y se crea la reserva real marcada como pagada.
 * - Legacy: la reserva ya existía (anticipo) y se busca por referencia.
 *
 * Idempotente: si la orden ya se capturó antes, devuelve ok sin duplicar.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { orderID?: string; reference?: string }
    | null;
  const orderID = body?.orderID;
  const reference =
    typeof body?.reference === "string" ? body.reference.trim().toUpperCase() : "";
  if (!orderID) {
    return NextResponse.json({ error: "missing-data" }, { status: 400 });
  }

  const cfg = await getPayPalConfig();
  if (!cfg) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  // Sesión del cliente (opcional, para vincular pagador de PayPal al usuario).
  const session = await getCurrentUser().catch(() => null);

  try {
    const { status, body: paypalBody } = await capturePayPalOrder(cfg, orderID);
    if (status !== "COMPLETED") {
      return NextResponse.json({ ok: false, status }, { status: 402 });
    }

    // Verificar que el pagador de PayPal coincida con el usuario de sesión
    // (solo advertencia: no se bloquea por si el cliente paga con email distinto).
    const payerEmail =
      paypalBody &&
      typeof paypalBody === "object" &&
      "payer" in paypalBody &&
      paypalBody.payer &&
      typeof paypalBody.payer === "object" &&
      "email_address" in paypalBody.payer
        ? String((paypalBody as { payer: { email_address?: string } }).payer.email_address ?? "")
        : "";
    if (session && payerEmail && payerEmail !== session.user.email) {
      console.warn(
        `[paypal] payer email (${payerEmail}) differs from session user (${session.user.email})`,
      );
    }

    // --- FLUJO PAYMENT-FIRST: consumir reserva pendiente y crear la real ---
    const pendingResult = await finishPendingBooking(orderID);
    if (pendingResult.ok) {
      return NextResponse.json({ ok: true, reference: pendingResult.reference });
    }

    // --- FLUJO LEGACY: si no hay pendiente, buscar por referencia ---
    const booking = reference ? await getBookingByReference(reference) : null;
    if (booking) {
      // Idempotente: si ya está pagada, no volver a marcar.
      if (booking.payment_status === "paid") {
        return NextResponse.json({ ok: true, reference: booking.reference });
      }
      await markPaidLegacy(reference);
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
      return NextResponse.json({ ok: true, reference });
    }

    // Si la pendiente ya fue consumida (doble captura) y no hay reference,
    // el pago ya se procesó en PayPal: devolver ok para no mostrar fraude al cliente.
    if (
      pendingResult.error === "pending-not-found" &&
      session
    ) {
      return NextResponse.json({ ok: true, reference: "" });
    }

    return NextResponse.json(
      { ok: false, error: pendingResult.error ?? "no-booking" },
      { status: 404 },
    );
  } catch (err) {
    console.error("[paypal] fallo al capturar:", err);
    return NextResponse.json(
      { error: "capture-failed", detail: String(err) },
      { status: 502 },
    );
  }
}

async function markPaidLegacy(reference: string): Promise<void> {
  const { markBookingPaidByReference } = await import("@/lib/db/bookings");
  await markBookingPaidByReference(reference);
}