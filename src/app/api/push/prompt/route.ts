/**
 * Marca el aviso de instalación/notificaciones como visto o aceptado.
 *
 * Sirve para no repetir el cartel al cliente. Si no hay sesión, se responde
 * 401: el aviso solo tiene sentido para usuarios con cuenta (el push se
 * asocia a un `user_id`).
 */
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { markPromptAccepted, markPromptSeen } from "@/lib/db/push";

export const dynamic = "force-dynamic";

type Body = { kind?: "install" | "notify"; accepted?: boolean };

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

  const kind = body.kind === "notify" ? "notify" : "install";
  if (body.accepted === true) await markPromptAccepted(session.user.id, kind);
  else await markPromptSeen(session.user.id, kind);

  return NextResponse.json({ ok: true });
}