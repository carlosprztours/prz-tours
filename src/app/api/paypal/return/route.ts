import { NextResponse } from "next/server";

import { captureAndFinishPendingBooking } from "@/lib/payments/paypal-capture";

/**
 * GET /api/paypal/return — vuelta tras pagar (o cancelar) en PayPal cuando el
 * pago se hizo por redirección (sin JavaScript) o el SDK no estuvo disponible.
 *
 * PayPal devuelve al cliente aquí después de aprobar la orden (los URLs se
 * fijaron al crear la orden en `application_context.return_url/cancel_url`).
 * Si el pago se completó, se crea la reserva real y se redirige a la página
 * de éxito. Si se canceló, se vuelve al formulario con un error amable.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderID = url.searchParams.get("token") ?? url.searchParams.get("orderID") ?? "";
  const cancelled = url.searchParams.get("cancelled") === "1";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "es";

  if (!orderID) {
    return NextResponse.redirect(
      new URL(`/${locale}/book?error=paypal-missing-order`, request.url),
    );
  }
  if (cancelled) {
    return NextResponse.redirect(
      new URL(`/${locale}/book?error=paypal-cancelled`, request.url),
    );
  }

  const result = await captureAndFinishPendingBooking(orderID);

  if (result.ok) {
    return NextResponse.redirect(
      new URL(`/${locale}/book/success?ref=${encodeURIComponent(result.reference)}`, request.url),
    );
  }

  console.error("[paypal-return] no se pudo finalizar la reserva:", result.error, orderID);
  return NextResponse.redirect(
    new URL(`/${locale}/book?error=paypal-failed`, request.url),
  );
}