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
    pickup_time: string | null;
    status: string;
  }>(
    `SELECT reference, tour_title, transfer_label, booked_for, pickup_time, status
     FROM bookings
     WHERE (user_id = ? OR customer_email = ? COLLATE NOCASE)
       AND status IN ('pending', 'confirmed')
     ORDER BY created_at DESC, id DESC
     LIMIT 10`,
    session.user.id,
    session.user.email,
  ).catch(() => []);

  const now = Date.now();
  return NextResponse.json({
    bookings: rows.map((b) => ({
      reference: b.reference,
      title: b.tour_title || b.transfer_label || "—",
      booked_for: b.booked_for,
      status: b.status,
      cancellable: isCancellable(b.booked_for, b.pickup_time, now),
    })),
  });
}

/**
 * Cancelable hasta 48 h antes del evento. Sin fecha fija siempre se puede
 * pedir (se coordina por chat); con fecha se exige el margen.
 */
function isCancellable(
  bookedFor: string | null,
  pickupTime: string | null,
  nowMs: number,
): boolean {
  if (!bookedFor) return true;
  const time =
    pickupTime && /^\d{2}:\d{2}$/.test(pickupTime) ? pickupTime : "09:00";
  const eventMs = new Date(`${bookedFor}T${time}:00`).getTime();
  if (Number.isNaN(eventMs)) return true;
  return eventMs - nowMs > 48 * 3600 * 1000;
}
