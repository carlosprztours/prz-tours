/**
 * GET /api/notifications — últimos avisos + no leídos del usuario.
 */
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import {
  countUnreadNotifications,
  listUserNotifications,
} from "@/lib/db/loyalty";

export async function GET() {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ logged: false, unread: 0, items: [] });
  }
  const [unread, items] = await Promise.all([
    countUnreadNotifications(session.user.id),
    listUserNotifications(session.user.id, 6),
  ]);
  return NextResponse.json({ logged: true, unread, items });
}
