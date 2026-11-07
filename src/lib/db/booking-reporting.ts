import "server-only";

import { batch, query } from "./client";

export const PROTECTED_BOOKING_REFERENCES = ["PRZ-EANCY5", "PRZ-X9E3EC"];
export type ReportingAction = "archive" | "restore" | "exclude" | "include";

export async function changeBookingReporting(
  bookingId: number,
  action: ReportingAction,
  reason: string,
  actor: { id: number; email: string },
) {
  const column = action === "archive" || action === "restore" ? "archived_at" : "excluded_from_reports_at";
  const enabled = action === "archive" || action === "exclude";
  const result = await batch([
    {
      sql: `UPDATE bookings SET ${column} = ${enabled ? "datetime('now')" : "NULL"}
             WHERE id = ? AND ${column} IS ${enabled ? "" : "NOT "}NULL
             AND reference NOT IN (?, ?)`,
      params: [bookingId, ...PROTECTED_BOOKING_REFERENCES],
    },
    {
      sql: `INSERT INTO booking_reporting_events (booking_id, actor_user_id, actor_label, action, reason)
             SELECT ?, ?, ?, ?, ? WHERE changes() = 1`,
      params: [bookingId, actor.id, actor.email, action, reason],
    },
  ]);
  return result[0].meta.changes === 1;
}

export function listBookingReportingEvents(id: number) {
  return query<{ id: number; actor_label: string; action: ReportingAction; reason: string; created_at: string }>(
    "SELECT id, actor_label, action, reason, created_at FROM booking_reporting_events WHERE booking_id = ? ORDER BY id DESC",
    id,
  );
}

// deposit_paid stores the amount recorded by payment processing. A manual
// paid/partial flag alone gives no amount. No refund amount is persisted today.
export function getBookingFinancialSummary() {
  return query<{
    currency: string; collected: number; excluded: number; excludedFaceValue: number; knownNet: number;
    pending: number; cancelled: number; archived: number; refunded: number; unquantified: number;
    includedUnquantified: number;
  }>(`SELECT currency,
    SUM(ROUND(MAX(deposit_paid, 0) * 100)) / 100.0 AS collected,
    SUM(CASE WHEN excluded_from_reports_at IS NOT NULL THEN ROUND(MAX(deposit_paid, 0) * 100) ELSE 0 END) / 100.0 AS excluded,
    SUM(CASE WHEN excluded_from_reports_at IS NOT NULL THEN ROUND(total_price * 100) ELSE 0 END) / 100.0 AS excludedFaceValue,
    SUM(CASE WHEN excluded_from_reports_at IS NULL AND payment_status <> 'refunded'
        THEN ROUND(MAX(deposit_paid, 0) * 100) ELSE 0 END) / 100.0 AS knownNet,
    SUM(CASE WHEN status <> 'cancelled' AND payment_status IN ('unpaid', 'partial') THEN 1 ELSE 0 END) AS pending,
    SUM(status = 'cancelled') AS cancelled,
    SUM(archived_at IS NOT NULL) AS archived,
    SUM(payment_status = 'refunded') AS refunded,
    SUM(payment_status IN ('paid', 'partial') AND deposit_paid <= 0) AS unquantified,
    SUM(excluded_from_reports_at IS NULL AND (payment_status = 'refunded'
        OR (payment_status IN ('paid', 'partial') AND deposit_paid <= 0))) AS includedUnquantified
    FROM bookings GROUP BY currency ORDER BY currency`);
}
