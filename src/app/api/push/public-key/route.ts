/**
 * Clave pública VAPID.
 *
 * El cliente la necesita para suscribirse (`pushManager.subscribe`). Se
 * entrega sin autenticación a propósito: es pública por definición y así el
 * navegador puede pedir el permiso aunque la sesión se resuelva después.
 * Devuelve 503 si el push no está configurado, para que la UI lo oculte.
 */
import { NextResponse } from "next/server";

import { getVapidPublicKey } from "@/lib/db/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = await getVapidPublicKey();
  if (!key) {
    return NextResponse.json({ ok: false, reason: "not-configured" }, { status: 503 });
  }
  return NextResponse.json(
    { ok: true, publicKey: key },
    { headers: { "cache-control": "no-store" } },
  );
}