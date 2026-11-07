import "server-only";

import { query, queryOne } from "./client";
import type { BookingStatus } from "@/types";

export async function getDashboardMetrics() {
  const row = await queryOne<{ pendingBookings: number | null; totalGuests: number | null }>(
    `SELECT SUM(status = 'pending') AS pendingBookings,
            SUM(CASE WHEN status IN ('confirmed','completed') THEN guests ELSE 0 END) AS totalGuests
       FROM bookings WHERE archived_at IS NULL`,
  );
  return { pendingBookings: row?.pendingBookings ?? 0, totalGuests: row?.totalGuests ?? 0 };
}

/** Últimas reservas (para el widget de actividad reciente). */
export async function getRecentBookings(limit = 8): Promise<
  {
    id: number;
    reference: string;
    customer_name: string;
    tour_title: string;
    transfer_label: string | null;
    guests: number;
    total_price: number;
    status: BookingStatus;
    created_at: string;
  }[]
> {
  return query(
    `SELECT id, reference, customer_name, tour_title, transfer_label,
            guests, total_price, status, created_at
     FROM bookings
     WHERE archived_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    limit,
  );
}
