import { NextResponse } from "next/server";

import { getPayPalConfig } from "@/lib/payments/paypal";

/** Expone solo lo que el botón público necesita (nunca el secreto). */
export async function GET() {
  const cfg = await getPayPalConfig();
  if (!cfg) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({
    enabled: true,
    clientId: cfg.clientId,
    mode: cfg.mode,
  });
}
