/**
 * Disponibilidad por tour y fecha.
 *
 * REGLA: `max_group` es el cupo máximo de personas por día y tour.
 * Ocupado = suma de `guests` de reservas `pending` + `confirmed` para esa
 * fecha (las canceladas/completadas no ocupan). Las reservas sin fecha no
 * ocupan cupo.
 */
import "server-only";

import { query } from "./client";

const ACTIVE = `status IN ('pending','confirmed')`;

/** Personas ya ocupadas para un tour en una fecha (AAAA-MM-DD). */
export async function getBookedGuests(
  tourId: number,
  date: string,
): Promise<number> {
  const rows = await query<{ total: number | null }>(
    `SELECT SUM(guests) AS total FROM bookings
     WHERE tour_id = ? AND booked_for = ? AND ${ACTIVE}`,
    tourId,
    date,
  );
  return rows[0]?.total ?? 0;
}

export type Availability = {
  maxGroup: number;
  booked: number;
  remaining: number;
  /** Pocos lugares (para el aviso de urgencia). */
  low: boolean;
};

export async function getAvailability(
  tourId: number,
  date: string | null | undefined,
): Promise<Availability | null> {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!Number.isInteger(tourId) || tourId <= 0) return null;
  const tour = await query<{ max_group: number | null }>(
    `SELECT max_group FROM tours WHERE id = ?`,
    tourId,
  );
  const cap = Math.max(1, tour[0]?.max_group ?? 20);
  const booked = await getBookedGuests(tourId, date);
  const remaining = Math.max(0, cap - booked);
  return { maxGroup: cap, booked, remaining, low: remaining <= 5 };
}

/**
 * Ocupación de un mes: por día, total de personas en reservas activas.
 * Para el calendario del panel.
 */
export async function getMonthOccupancy(
  yearMonth: string,
): Promise<{ date: string; guests: number; bookings: number }[]> {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return [];
  return query(
    `SELECT booked_for AS date, SUM(guests) AS guests, COUNT(*) AS bookings
     FROM bookings
     WHERE ${ACTIVE}
       AND booked_for LIKE ? || '-%'
     GROUP BY booked_for
     ORDER BY booked_for ASC`,
    yearMonth,
  );
}

/** Desglose por tour de un día concreto (para el panel). */
export async function getDayBreakdown(date: string): Promise<
  {
    tour_id: number | null;
    tour_title: string;
    guests: number;
    bookings: number;
  }[]
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return query(
    `SELECT tour_id,
            COALESCE(NULLIF(tour_title, ''), transfer_label, '-') AS tour_title,
            SUM(guests) AS guests,
            COUNT(*) AS bookings
     FROM bookings
     WHERE ${ACTIVE} AND booked_for = ?
     GROUP BY tour_id, tour_title, transfer_label
     ORDER BY guests DESC`,
    date,
  );
}
