/**
 * GET /api/bookings/mine — reservas accionables del usuario (para el menú
 * de WhatsApp: elegir cuál confirmar sin escribir la referencia).
 *
 * Solo sesión: pendientes o confirmadas, las más recientes primero.
 */
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { query } from "@/lib/db/client";

export async function GET() {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ bookings: [] });
  }
  const rows = await query<{
    reference: string;
    tour_title: string;
    transfer_label: string | null;
    booked_for: string | null;
    status: string;
  }>(
    `SELECT reference, tour_title, transfer_label, booked_for, status
     FROM bookings
     WHERE (user_id = ? OR customer_email = ? COLLATE NOCASE)
       AND status IN ('pending', 'confirmed')
     ORDER BY created_at DESC, id DESC
     LIMIT 10`,
    session.user.id,
    session.user.email,
  ).catch(() => []);
  return NextResponse.json({
    bookings: rows.map((b) => ({
      reference: b.reference,
      title: b.tour_title || b.transfer_label || "—",
      booked_for: b.booked_for,
      status: b.status,
    })),
  });
}
