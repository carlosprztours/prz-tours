"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRoles } from "./access";
import { execute, query } from "@/lib/db/client";

type Outcome = { ok: boolean; token?: string };

type Service = {
  id: number;
  reference: string;
  booking_status: string;
  booked_for: string | null;
  pickup_time: string | null;
  pickup: string | null;
  destination: string;
  guests: number;
  phone: string | null;
  driver_name: string;
  assigned_at: string;
  withdrawn_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  validated_at: string | null;
  validated_by: number | null;
};

export async function listServices(locale: string, id?: number) {
  const { session: { user } } = await requireStaffRoles(locale, "admin", "driver");
  const admin = user.role === "admin" ? 1 : 0;
  return query<Service>(
    `SELECT a.id, b.reference, b.status AS booking_status, b.booked_for, b.pickup_time,
       COALESCE(NULLIF(b.meeting_point,''), NULLIF(b.hotel,''), NULLIF(b.airport,''), b.cruise_port) AS pickup,
       COALESCE(NULLIF(b.tour_title,''), NULLIF(b.transfer_label,''), b.kind) AS destination,
       b.guests, CASE WHEN a.withdrawn_at IS NULL AND a.finished_at IS NULL AND b.status = 'confirmed'
         THEN b.customer_phone END AS phone,
       a.driver_name, a.assigned_at, a.withdrawn_at, a.arrived_at, a.started_at, a.finished_at,
       (SELECT q.validated_at FROM service_qr_codes q WHERE q.assignment_id = a.id AND q.validated_at IS NOT NULL LIMIT 1) AS validated_at,
       CASE WHEN ? = 1 THEN (SELECT q.validated_by FROM service_qr_codes q WHERE q.assignment_id = a.id AND q.validated_at IS NOT NULL LIMIT 1) END AS validated_by
     FROM service_assignments a JOIN bookings b ON b.id = a.booking_id
     WHERE (? = 1 OR a.driver_id = ?) AND (? IS NULL OR a.id = ?)
     ORDER BY (a.withdrawn_at IS NOT NULL OR a.finished_at IS NOT NULL) ASC,
       b.booked_for ASC, b.pickup_time ASC, a.id DESC LIMIT 200`,
    admin, admin, user.id, id ?? null, id ?? null,
  );
}

export async function listAssignmentOptions(locale: string) {
  await requireStaffRoles(locale, "admin");
  const [drivers, bookings] = await Promise.all([
    query<{ id: number; name: string; is_active: number }>(
      "SELECT id, name, is_active FROM users WHERE role = 'driver' ORDER BY name, id",
    ),
    query<{ id: number; reference: string; booked_for: string | null; pickup_time: string | null; assignment_id: number | null }>(
      `SELECT b.id, b.reference, b.booked_for, b.pickup_time, a.id AS assignment_id
       FROM bookings b LEFT JOIN service_assignments a ON a.booking_id = b.id AND a.withdrawn_at IS NULL
       WHERE b.status = 'confirmed' AND a.finished_at IS NULL
       ORDER BY a.id IS NOT NULL, b.booked_for, b.pickup_time, b.id LIMIT 200`,
    ),
  ]);
  return { drivers, bookings };
}

function refresh(locale: string, id?: number) {
  revalidatePath(`/${locale}/admin/assignments`);
  revalidatePath(`/${locale}/admin/services`);
  if (id) revalidatePath(`/${locale}/admin/services/${id}`);
}

export async function assignService(raw: string, form: FormData): Promise<Outcome> {
  const { locale, session: { user } } = await requireStaffRoles(raw, "admin");
  const [booking, previous] = String(form.get("booking") ?? "").split(":").map(Number);
  const driver = Number(form.get("driver"));
  if (![booking, driver, previous].every(Number.isSafeInteger) || booking < 1 || driver < 1 || previous < 0) return { ok: false };
  const result = await execute(
    `INSERT INTO service_assignments (booking_id, driver_id, driver_name, assigned_by)
     SELECT b.id, u.id, u.name, ? FROM bookings b JOIN users u ON u.id = ?
     WHERE b.id = ? AND b.status = 'confirmed' AND u.role = 'driver' AND u.is_active = 1
       AND COALESCE((SELECT a.id FROM service_assignments a
         WHERE a.booking_id = b.id AND a.withdrawn_at IS NULL), 0) = ?
       AND NOT EXISTS (SELECT 1 FROM service_assignments a WHERE a.booking_id = b.id
         AND a.withdrawn_at IS NULL AND (a.started_at IS NOT NULL OR a.driver_id = u.id))
       AND NOT EXISTS (
         SELECT 1 FROM service_assignments a JOIN bookings other ON other.id = a.booking_id
         WHERE a.driver_id = u.id AND a.withdrawn_at IS NULL AND a.finished_at IS NULL
           AND other.status = 'confirmed' AND other.id != b.id
           AND other.booked_for = b.booked_for AND other.pickup_time = b.pickup_time
           AND NULLIF(b.pickup_time, '') IS NOT NULL
       )`, user.id, driver, booking, previous,
  );
  refresh(locale);
  // D1 includes the previous assignment withdrawal performed by the trigger.
  return { ok: result.meta.changes > 0 };
}

export async function withdrawService(raw: string, id: number): Promise<Outcome> {
  const { locale, session: { user } } = await requireStaffRoles(raw, "admin");
  const r = await execute(`UPDATE service_assignments SET withdrawn_at = datetime('now'), withdrawn_by = ?
    WHERE id = ? AND withdrawn_at IS NULL AND finished_at IS NULL`, user.id, id);
  refresh(locale, id);
  return { ok: r.meta.changes === 1 };
}

const steps = {
  arrive: { column: "arrived_at", prerequisite: "1 = 1" },
  start: { column: "started_at", prerequisite: "arrived_at IS NOT NULL" },
  finish: { column: "finished_at", prerequisite: "started_at IS NOT NULL" },
} as const;

export async function progressService(raw: string, id: number, step: keyof typeof steps): Promise<Outcome> {
  const { locale, session: { user } } = await requireStaffRoles(raw, "admin", "driver");
  if (!Object.hasOwn(steps, step)) return { ok: false };
  const { column, prerequisite } = steps[step];
  const r = await execute(
    `UPDATE service_assignments SET ${column} = datetime('now')
     WHERE id = ? AND withdrawn_at IS NULL AND finished_at IS NULL AND ${column} IS NULL
       AND ${prerequisite} AND (? = 'admin' OR driver_id = ?)
       AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.status = 'confirmed')`,
    id, user.role, user.id,
  );
  refresh(locale, id);
  return { ok: r.meta.changes === 1 };
}

async function hashToken(token: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function issueServiceQr(raw: string, id: number): Promise<Outcome> {
  const { locale, session: { user } } = await requireStaffRoles(raw, "admin");
  const token = crypto.randomUUID();
  const r = await execute(
    `INSERT INTO service_qr_codes (assignment_id, token_hash, issued_by)
     SELECT a.id, ?, ? FROM service_assignments a JOIN bookings b ON b.id = a.booking_id
     WHERE a.id = ? AND a.withdrawn_at IS NULL AND a.finished_at IS NULL AND b.status = 'confirmed'
       AND NOT EXISTS (SELECT 1 FROM service_qr_codes q JOIN service_assignments old ON old.id = q.assignment_id
         WHERE old.booking_id = a.booking_id AND q.validated_at IS NOT NULL)`,
    await hashToken(token), user.id, id,
  );
  refresh(locale, id);
  return r.meta.changes > 0 ? { ok: true, token } : { ok: false };
}

export async function revokeServiceQr(raw: string, id: number): Promise<Outcome> {
  const { locale, session: { user } } = await requireStaffRoles(raw, "admin");
  const r = await execute(`UPDATE service_qr_codes SET revoked_at = datetime('now'), revoked_by = ?
     WHERE assignment_id = ? AND revoked_at IS NULL AND validated_at IS NULL`, user.id, id);
  refresh(locale, id);
  return { ok: r.meta.changes === 1 };
}

export async function validateServiceQr(raw: string, form: FormData, assignmentId?: number): Promise<Outcome> {
  const { locale, session: { user } } = await requireStaffRoles(raw, "admin", "driver");
  const token = String(form.get("token") ?? "").trim().split("#").pop() ?? "";
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(token)) return { ok: false };
  const r = await execute(
    `UPDATE service_qr_codes SET validated_at = datetime('now'), validated_by = ?
     WHERE token_hash = ? AND revoked_at IS NULL AND validated_at IS NULL
       AND (? IS NULL OR assignment_id = ?)
       AND EXISTS (SELECT 1 FROM service_assignments a JOIN bookings b ON b.id = a.booking_id
         WHERE a.id = assignment_id AND a.withdrawn_at IS NULL AND a.finished_at IS NULL
           AND b.status = 'confirmed' AND (? = 'admin' OR a.driver_id = ?)
           AND NOT EXISTS (SELECT 1 FROM service_qr_codes used JOIN service_assignments old ON old.id = used.assignment_id
             WHERE old.booking_id = a.booking_id AND used.validated_at IS NOT NULL))`,
    user.id, await hashToken(token), assignmentId ?? null, assignmentId ?? null, user.role, user.id,
  );
  refresh(locale, assignmentId);
  return { ok: r.meta.changes === 1 };
}
