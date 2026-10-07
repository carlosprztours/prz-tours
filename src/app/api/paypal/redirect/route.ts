import { NextResponse } from "next/server";

import { getPayPalConfig } from "@/lib/payments/paypal";

/**
 * GET /api/paypal/redirect?orderID=... — redirige al usuario a PayPal
 * para aprobar el pago. Se usa tras crear la orden en la Server Action.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderID = searchParams.get("orderID");

  if (!orderID) {
    return NextResponse.redirect(new URL("/es/book?error=paypal-missing-order", request.url));
  }

  const cfg = await getPayPalConfig();
  if (!cfg) {
    return NextResponse.redirect(new URL("/es/book?error=paypal-not-configured", request.url));
  }

  try {
    // Obtener la orden para saber su approve_url
    const tokenRes = await fetch(`https://api-m.${cfg.mode === "live" ? "" : "sandbox."}paypal.com/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${cfg.clientId}:${cfg.secret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const token = tokenData.access_token;

    if (!token) throw new Error("no-token");

    const orderRes = await fetch(`https://api-m.${cfg.mode === "live" ? "" : "sandbox."}paypal.com/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const order = (await orderRes.json()) as { links?: { rel: string; href: string }[] };

    const approveUrl = order.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
    if (!approveUrl) throw new Error("no-approve-url");

    return NextResponse.redirect(approveUrl);
  } catch (err) {
    console.error("[paypal-redirect] error:", err);
    return NextResponse.redirect(new URL("/es/book?error=paypal-redirect-failed", request.url));
  }
}