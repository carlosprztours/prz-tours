/**
 * POST /api/notifications/read — marca avisos como leídos.
 *
 * Body: `{ all: true }` o `{ ids: [1, 2] }`. Solo los propios.
 */
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { markNotificationsRead } from "@/lib/db/loyalty";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { all?: boolean; ids?: number[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const ids =
    body.all || !Array.isArray(body.ids)
      ? undefined
      : body.ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 50);
  await markNotificationsRead(session.user.id, ids);
  return NextResponse.json({ ok: true });
}
