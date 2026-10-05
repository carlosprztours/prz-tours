/**
 * Alta/baja de la suscripción push del usuario autenticado.
 *
 * POST  { subscription: PushSubscriptionJSON.toJSON() }  → guarda
 * POST  { endpoint }                                      → borra (desuscribir)
 */
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { deleteSubscription, saveSubscription } from "@/lib/db/push";

export const dynamic = "force-dynamic";

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  endpoint?: string;
};

export async function POST(request: Request) {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  // Baja: mandan el endpoint que quieren eliminar.
  if (!body.subscription && body.endpoint) {
    await deleteSubscription(session.user.id, body.endpoint);
    return NextResponse.json({ ok: true });
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, error: "bad-subscription" }, { status: 400 });
  }

  await saveSubscription(
    session.user.id,
    { endpoint, keys: { p256dh, auth } },
    request.headers.get("user-agent"),
  );
  return NextResponse.json({ ok: true });
}