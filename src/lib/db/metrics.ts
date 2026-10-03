/**
 * Métricas del dashboard: ingresos y actividad.
 *
 * REGLA DE NEGOCIO: solo las reservas `confirmed` y `completed` cuentan como
 * ingreso. Las `pending` son intención; las `cancelled` no generan nada.
 * Toda la lógica de dinero del panel depende de esta regla.
 */
import "server-only";

import { query, queryOne } from "./client";
import type {
  BookingStatus,
  DashboardMetrics,
  RevenueByMonth,
  RevenueByTour,
} from "@/types";

/** Estados que generan ingreso. */
export const REVENUE_STATUSES: BookingStatus[] = ["confirmed", "completed"];

const revenueWhere = `status IN ('confirmed','completed')`;

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const counts = await query<{ status: BookingStatus; n: number }>(
    `SELECT status, COUNT(*) AS n FROM bookings GROUP BY status`,
  );
  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c.n;

  const revenue = await queryOne<{ total: number | null }>(
    `SELECT SUM(total_price) AS total FROM bookings WHERE ${revenueWhere}`,
  );

  const month = await queryOne<{ total: number | null }>(
    `SELECT SUM(total_price) AS total FROM bookings
     WHERE ${revenueWhere}
       AND strftime('%Y-%m', booked_for || ' 00:00:00') = strftime('%Y-%m', 'now')`,
  );

  const lastMonth = await queryOne<{ total: number | null }>(
    `SELECT SUM(total_price) AS total FROM bookings
     WHERE ${revenueWhere}
       AND strftime('%Y-%m', booked_for || ' 00:00:00') =
           strftime('%Y-%m', 'now', '-1 month')`,
  );

  const guests = await queryOne<{ total: number | null }>(
    `SELECT SUM(guests) AS total FROM bookings WHERE ${revenueWhere}`,
  );

  const misc = await queryOne<{
    unread: number;
    tours: number;
    total: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM messages WHERE is_read = 0) AS unread,
       (SELECT COUNT(*) FROM tours WHERE is_published = 1) AS tours,
       (SELECT COUNT(*) FROM bookings) AS total`,
  );

  return {
    totalBookings: misc?.total ?? 0,
    pendingBookings: byStatus.pending ?? 0,
    confirmedBookings: byStatus.confirmed ?? 0,
    completedBookings: byStatus.completed ?? 0,
    cancelledBookings: byStatus.cancelled ?? 0,
    totalRevenue: revenue?.total ?? 0,
    monthRevenue: month?.total ?? 0,
    lastMonthRevenue: lastMonth?.total ?? 0,
    totalGuests: guests?.total ?? 0,
    bookingCount:
      (byStatus.confirmed ?? 0) + (byStatus.completed ?? 0),
    unreadMessages: misc?.unread ?? 0,
    publishedTours: misc?.tours ?? 0,
  };
}

/** Ingresos por mes (últimos 12 meses con actividad). */
export async function getRevenueByMonth(
  limit = 12,
): Promise<RevenueByMonth[]> {
  return query<RevenueByMonth>(
    `SELECT strftime('%Y-%m', booked_for) AS month,
            SUM(total_price) AS revenue,
            COUNT(*) AS bookings
     FROM bookings
     WHERE ${revenueWhere} AND booked_for IS NOT NULL
     GROUP BY month
     ORDER BY month DESC
     LIMIT ?`,
    limit,
  );
}

/** Ingresos por tour (para saber qué se vende más). */
export async function getRevenueByTour(limit = 10): Promise<RevenueByTour[]> {
  return query<RevenueByTour>(
    `SELECT tour_slug,
            COALESCE(NULLIF(tour_title, ''), 'Traslado / personalizado') AS tour_title,
            SUM(total_price) AS revenue,
            COUNT(*) AS bookings
     FROM bookings
     WHERE ${revenueWhere}
     GROUP BY tour_slug, tour_title
     ORDER BY revenue DESC
     LIMIT ?`,
    limit,
  );
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
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    limit,
  );
}
