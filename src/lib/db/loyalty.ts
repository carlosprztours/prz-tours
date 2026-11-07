/**
 * Programa de fidelidad: cupones personales, referidos y avisos.
 *
 * Reglas (una sola fuente de verdad, documentadas también en docs/RUTAS.md):
 *
 * - Cupón de invitado: 10 % al registrarse con enlace de invitado, de un
 *   solo uso y solo para esa cuenta (anti-abuso por propiedad).
 * - Cupón recurrente: cada 2 viajes COMPLETADOS (status `completed`) se
 *   emite un 10 % automático… salvo que la cuenta ya tenga un cupón
 *   activo (máximo 1 activo por cuenta). Al emitir, el contador se reinicia.
 * - Si el cupón ya se usó, el contador sigue corriendo y puede generar más.
 * - Los invitados empiezan a contar desde su primer viaje (el primero
 *   suele llevar el descuento de invitado).
 * - Los cupones caducan a los 90 días; el admin puede crear manuales con
 *   otra caducidad y enviarlos por correo.
 *
 * Los cupones personales conviven con los genéricos de `promo_codes`: al
 * cotizar se prueba primero el personal (propiedad estricta) y luego el
 * genérico.
 */
import "server-only";

import { batch, execute, query, queryOne } from "./client";

export const LOYALTY_DISCOUNT = 10;
export const TRIPS_PER_COUPON = 2;
export const COUPON_EXPIRY_DAYS = 90;

/** Alfabeto sin caracteres confusos (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type Coupon = {
  id: number;
  code: string;
  user_id: number;
  kind: "percent" | "amount";
  value: number;
  reason: "invite" | "loyalty" | "manual";
  status: "active" | "used" | "expired" | "cancelled";
  booking_id: number | null;
  expires_at: string | null;
  created_at: string;
  used_at: string | null;
};

export type Notification = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: number;
  created_at: string;
};

function makeCouponCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `PEREZ-${code}`;
}

function expiryDate(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** ¿El cupón sigue vigente? (activo y sin caducar). */
export function couponIsLive(coupon: Coupon): boolean {
  if (coupon.status !== "active") return false;
  if (coupon.expires_at && coupon.expires_at <= new Date().toISOString().slice(0, 19).replace("T", " ")) {
    return false;
  }
  return true;
}

/** Cupón activo de la cuenta (máximo 1). */
export async function activeCouponFor(userId: number): Promise<Coupon | null> {
  const coupon = await queryOne<Coupon>(
    `SELECT * FROM coupons WHERE user_id = ? AND status = 'active'
       AND (expires_at IS NULL OR expires_at > datetime('now'))
     ORDER BY id DESC LIMIT 1`,
    userId,
  );
  if (!coupon || !couponIsLive(coupon)) return null;
  return coupon;
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return queryOne<Coupon>(
    `SELECT * FROM coupons WHERE code = ? COLLATE NOCASE`,
    normalized,
  );
}

/**
 * Emite un cupón (con aviso en la web). Si `email` se provee, también lo
 * envía por correo con la plantilla de la marca.
 */
export async function issueCoupon(input: {
  userId: number;
  kind?: "percent" | "amount";
  value?: number;
  reason: Coupon["reason"];
  expiresInDays?: number;
  sendEmail?: boolean;
  locale?: "es" | "en";
}): Promise<Coupon> {
  const kind = input.kind ?? "percent";
  const value = input.value ?? LOYALTY_DISCOUNT;
  const expires = expiryDate(input.expiresInDays ?? COUPON_EXPIRY_DAYS);

  let coupon: Coupon | null = null;
  for (let attempt = 0; attempt < 3 && !coupon; attempt++) {
    const code = makeCouponCode();
    try {
      await execute(
        `INSERT INTO coupons (code, user_id, kind, value, reason, status, expires_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`,
        code,
        input.userId,
        kind,
        value,
        input.reason,
        expires,
      );
      coupon = await queryOne<Coupon>(`SELECT * FROM coupons WHERE code = ?`, code);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/UNIQUE constraint failed/i.test(msg)) throw err;
      coupon = null;
    }
  }
  if (!coupon) throw new Error("Could not issue coupon");

  await notifyCoupon(coupon, input.locale ?? "es");

  if (input.sendEmail) {
    await sendCouponEmail(coupon, input.locale ?? "es");
  }

  return coupon;
}

/** Envía un cupón por correo (creación manual o reenvío del admin). */
export async function sendCouponEmail(
  coupon: Coupon,
  locale: "es" | "en" = "es",
): Promise<boolean> {
  const es = locale === "es";
  const discountText =
    coupon.kind === "percent" ? `${coupon.value} %` : `$${coupon.value}`;
  const expires = (coupon.expires_at ?? "").slice(0, 10);
  const user = await queryOne<{ email: string; name: string }>(
    `SELECT email, name FROM users WHERE id = ?`,
    coupon.user_id,
  ).catch(() => null);
  if (!user) return false;
  const { sendEmail, emailLayout } = await import("../notify/email");
  const title = es ? `Tu cupón del ${discountText}` : `Your ${discountText} coupon`;
  const body = es
    ? `<p style="font-size:14px;color:#334155;">Hola ${user.name}, tienes un ${discountText} de descuento para tu próxima aventura. Tu código personal es:</p><p style="font-size:28px;font-weight:800;letter-spacing:2px;">${coupon.code}</p><p style="font-size:14px;color:#334155;">Escríbelo en el campo promocional al reservar. Válido hasta el ${expires} y de un solo uso.</p>`
    : `<p style="font-size:14px;color:#334155;">Hi ${user.name}, you have ${discountText} off your next adventure. Your personal code is:</p><p style="font-size:28px;font-weight:800;letter-spacing:2px;">${coupon.code}</p><p style="font-size:14px;color:#334155;">Enter it in the promo field when booking. Valid until ${expires}, single use.</p>`;
  const result = await sendEmail({
    to: user.email,
    subject: `${title} · ${coupon.code}`,
    html: emailLayout(title, body),
  }).catch(() => null);
  return result?.sent === true;
}

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: "not-found" | "not-yours" | "used" | "expired" };

/** Valida un cupón personal para un usuario y un total. No lo consume. */
export async function checkCoupon(
  code: string | undefined,
  userId: number | null,
  total: number,
): Promise<CouponCheck> {
  if (!code || !code.trim() || !userId) {
    return { ok: false, error: "not-found" };
  }
  const coupon = await getCouponByCode(code);
  if (!coupon) return { ok: false, error: "not-found" };
  if (coupon.user_id !== userId) return { ok: false, error: "not-yours" };
  if (coupon.status !== "active") return { ok: false, error: "used" };
  if (!couponIsLive(coupon)) {
    await execute(`UPDATE coupons SET status = 'expired' WHERE id = ? AND status = 'active'`, coupon.id).catch(() => {});
    return { ok: false, error: "expired" };
  }
  const discount =
    coupon.kind === "percent"
      ? Math.round(((total * coupon.value) / 100) * 100) / 100
      : Math.min(coupon.value, total);
  return { ok: true, coupon, discount };
}

/** Marca el cupón como usado en una reserva. */
export async function consumeCoupon(couponId: number, bookingId: number): Promise<void> {
  await execute(
    `UPDATE coupons SET status = 'used', booking_id = ?, used_at = datetime('now') WHERE id = ?`,
    bookingId,
    couponId,
  );
}

/** Completa la reserva, acredita el viaje y emite la recompensa en una transacción D1. */
export async function completeLoyaltyBooking(
  bookingId: number,
  owner: { id: number; locale: "es" | "en" } | null,
  note: string | null,
): Promise<{ completed: boolean; rewarded: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeCouponCode();
    const expires = expiryDate(COUPON_EXPIRY_DAYS);
    let result;
    try {
      // Cada paso condicionado usa el resultado de la escritura anterior del mismo batch.
      result = await batch([
        {
          sql: `UPDATE bookings SET status = 'completed', updated_at = datetime('now'),
                  completed_at = datetime('now') WHERE id = ? AND status = 'confirmed'`,
          params: [bookingId],
        },
        {
          sql: `INSERT INTO booking_events (booking_id, from_status, to_status, note, actor)
                SELECT ?, 'confirmed', 'completed', ?, 'staff' WHERE changes() = 1`,
          params: [bookingId, note],
        },
        {
          sql: `UPDATE users SET loyalty_trips = loyalty_trips + 1
                WHERE id = ? AND is_active = 1 AND changes() = 1`,
          params: [owner?.id ?? null],
        },
        {
          sql: `INSERT INTO coupons (code, user_id, kind, value, reason, status, expires_at)
                SELECT ?, u.id, 'percent', ?, 'loyalty', 'active', ? FROM users u
                WHERE u.id = ? AND changes() = 1 AND u.loyalty_trips >= ?
                  AND NOT EXISTS (
                    SELECT 1 FROM coupons c WHERE c.user_id = u.id AND c.status = 'active'
                      AND (c.expires_at IS NULL OR c.expires_at > datetime('now'))
                  )`,
          params: [code, LOYALTY_DISCOUNT, expires, owner?.id ?? null, TRIPS_PER_COUPON],
        },
        {
          sql: `UPDATE users SET loyalty_trips = 0 WHERE id = ? AND changes() = 1`,
          params: [owner?.id ?? null],
        },
      ]);
    } catch (error) {
      if (!(error instanceof Error) || !/UNIQUE constraint failed: coupons\.code/i.test(error.message)) throw error;
      continue;
    }
    const completed = result[0].meta.changes === 1;
    const rewarded = result[3].meta.changes === 1;
    if (rewarded && owner) {
      await notifyCoupon({ user_id: owner.id, kind: "percent", value: LOYALTY_DISCOUNT, code, expires_at: expires }, owner.locale);
    }
    return { completed, rewarded };
  }
  throw new Error("Could not issue loyalty coupon");
}

async function notifyCoupon(
  coupon: Pick<Coupon, "user_id" | "kind" | "value" | "code" | "expires_at">,
  locale: "es" | "en",
) {
  const es = locale === "es";
  const discount = coupon.kind === "percent" ? `${coupon.value} %` : `$${coupon.value}`;
  const expires = coupon.expires_at?.slice(0, 10) ?? "";
  await notifyUser(
    coupon.user_id,
    "coupon",
    es ? `Tienes un cupón del ${discount}` : `You have a ${discount} coupon`,
    es
      ? `Tu código es ${coupon.code}. Úsalo al reservar antes del ${expires}.`
      : `Your code is ${coupon.code}. Use it when booking before ${expires}.`,
    `/${locale}/book`,
    locale,
  );
}

// ───────────────────────────── Avisos ─────────────────────────────

export async function notifyUser(
  userId: number,
  type: Notification["type"],
  title: string,
  body: string,
  link?: string,
  lang?: "es" | "en",
): Promise<void> {
  await execute(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES (?, ?, ?, ?, ?)`,
    userId,
    type,
    title.slice(0, 160),
    body.slice(0, 500),
    link ?? null,
  ).catch((err) => console.error("[loyalty] notify error:", err));

  // Además del aviso dentro de la web, push al móvil del cliente (si lo
  // aceptó). Nunca debe romper el flujo: cualquier fallo se ignora.
  try {
    const { sendPushToUser } = await import("./push");
    await sendPushToUser(userId, {
      title,
      body,
      url: link ?? "/",
      tag: type,
      lang: lang ?? "es",
    });
  } catch (err) {
    console.error("[loyalty] push error:", err);
  }
}

/** Resuelve el usuario dueño de una reserva (por cuenta o por email). */
export async function resolveBookingUser(booking: {
  user_id?: number | null;
  customer_email: string;
}): Promise<{ id: number; locale: "es" | "en" } | null> {
  if (booking.user_id) {
    const row = await queryOne<{ id: number; locale: string }>(
      `SELECT id, locale FROM users WHERE id = ? AND is_active = 1`,
      booking.user_id,
    ).catch(() => null);
    if (row) return { id: row.id, locale: row.locale === "en" ? "en" : "es" };
  }
  const byEmail = await queryOne<{ id: number; locale: string }>(
    `SELECT id, locale FROM users WHERE email = ? AND is_active = 1`,
    booking.customer_email,
  ).catch(() => null);
  if (!byEmail) return null;
  return { id: byEmail.id, locale: byEmail.locale === "en" ? "en" : "es" };
}

export async function listUserCoupons(userId: number): Promise<Coupon[]> {
  return query<Coupon>(
    `SELECT * FROM coupons WHERE user_id = ? ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'used' THEN 1 ELSE 2 END,
       id DESC LIMIT 10`,
    userId,
  );
}

export async function listUserNotifications(
  userId: number,
  limit = 20,
): Promise<Notification[]> {
  return query<Notification>(
    `SELECT * FROM notifications WHERE user_id = ?
     ORDER BY created_at DESC, id DESC LIMIT ?`,
    userId,
    limit,
  );
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0`,
    userId,
  );
  return row?.n ?? 0;
}

export async function markNotificationsRead(
  userId: number,
  ids?: number[],
): Promise<void> {
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    await execute(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      userId,
      ...ids,
    );
  } else {
    await execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, userId);
  }
}

// ───────────────────────────── Referidos ─────────────────────────────

function makeInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

/** Código de invitado del usuario (lo crea si no existe). */
export async function getOrCreateInviteCode(userId: number): Promise<string> {
  const row = await queryOne<{ invite_code: string | null }>(
    `SELECT invite_code FROM users WHERE id = ?`,
    userId,
  );
  if (row?.invite_code) return row.invite_code;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeInviteCode();
    try {
      const changed = await execute(
        `UPDATE users SET invite_code = ? WHERE id = ? AND invite_code IS NULL`,
        code, userId,
      );
      if (changed.meta.changes === 1) return code;
      const current = await queryOne<{ invite_code: string }>(
        `SELECT invite_code FROM users WHERE id = ?`, userId,
      );
      if (current?.invite_code) return current.invite_code;
      throw new Error("Could not find invite account");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/UNIQUE constraint failed/i.test(msg)) throw err;
    }
  }
  throw new Error("Could not create invite code");
}

export async function findUserByInviteCode(code: string): Promise<number | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM users WHERE invite_code = ?`,
    normalized,
  );
  return row?.id ?? null;
}
