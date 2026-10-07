/**
 * Almacén temporal de reservas pendientes de pago PayPal.
 *
 * Guarda los datos de la reserva mientras el cliente paga en PayPal.
 * Se usa el `paypalOrderId` como clave. Expira a los 30 minutos.
 */
import "server-only";

import { execute, query } from "@/lib/db/client";

const TTL_SECONDS = 30 * 60; // 30 minutos

export interface PendingBookingData {
  kind: "tour" | "transfer" | "custom";
  tourId?: number;
  tourSlug?: string;
  transferRouteId?: number;
  promoCode?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCountry?: string;
  guests: number;
  bookedFor?: string;
  pickupTime?: string;
  hotel?: string;
  airport?: string;
  cruisePort?: string;
  meetingPoint?: string;
  notes?: string;
}

export interface PendingBooking {
  paypalOrderId: string;
  data: PendingBookingData;
  locale: string;
  userId: number;
  clientIp: string | null;
  amount: number;
  currency: string;
  totalPrice: number;
  depositDue: number;
  createdAt: string;
}

/** Guarda una reserva pendiente asociada a un orderId de PayPal. */
export async function setPendingBooking(
  paypalOrderId: string,
  payload: Omit<PendingBooking, "paypalOrderId" | "createdAt">,
): Promise<void> {
  await execute(
    `INSERT INTO pending_bookings (paypal_order_id, payload, expires_at)
     VALUES (?, ?, datetime('now', '+${TTL_SECONDS} seconds'))
     ON CONFLICT(paypal_order_id) DO UPDATE SET
       payload = excluded.payload,
       expires_at = excluded.expires_at`,
    paypalOrderId,
    JSON.stringify(payload),
  );
}

/** Recupera y elimina una reserva pendiente. */
export async function consumePendingBooking(
  paypalOrderId: string,
): Promise<PendingBooking | null> {
  const rows = await query<{ payload: string }>(
    `SELECT payload FROM pending_bookings WHERE paypal_order_id = ? AND expires_at > datetime('now')`,
    paypalOrderId,
  );
  if (!rows.length) return null;

  // Eliminar después de leer (consumo único)
  await execute(`DELETE FROM pending_bookings WHERE paypal_order_id = ?`, paypalOrderId);

  try {
    return JSON.parse(rows[0].payload) as PendingBooking;
  } catch {
    return null;
  }
}

/** Limpieza de entradas expiradas (se puede llamar desde un cron). */
export async function cleanupExpiredPendingBookings(): Promise<number> {
  const res = await execute(`DELETE FROM pending_bookings WHERE expires_at <= datetime('now')`);
  return (res as { changes?: number }).changes ?? 0;
}