/**
 * Reservas: creación pública y lectura para el panel.
 *
 * La referencia pública (`PRZ-XXXXXX`) se genera aquí con `crypto.randomUUID`
 * recortado a 6 caracteres alfanuméricos en mayúsculas. La probabilidad de
 * colisión es despreciable, pero la columna es UNIQUE y la inserción reintenta
 * hasta 3 veces por seguridad.
 *
 * IMPORTANTE para las métricas: `total_price` se calcula en el servidor a
 * partir del precio del tour en BD (nunca se confía en el precio que envía
 * el formulario).
 */
import "server-only";

import { execute, query, queryOne } from "./client";
import type { Booking, BookingEvent, BookingStatus, Locale } from "@/types";

export type CreateBookingInput = {
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
  locale: Locale;
  notes?: string;
  source?: string;
  clientIp?: string | null;
  /** Cuenta que reserva (la reserva ya exige sesión). */
  userId?: number | null;
};

export type BookingQuote = {
  unitPrice: number;
  totalPrice: number;
  currency: string;
  tourTitle: string;
  transferLabel: string | null;
  discount: number;
  promoId: number | null;
  promoCode: string | null;
  loyaltyCouponId: number | null;
  depositDue: number;
};

function makeReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let ref = "";
  for (const b of bytes) ref += alphabet[b % alphabet.length];
  return `PRZ-${ref}`;
}

/**
 * Calcula el precio desde la BD. Lanza si el tour o la ruta no existen o no
 * están publicados: una reserva siempre referencia contenido real.
 */
export async function quoteBooking(input: CreateBookingInput): Promise<BookingQuote> {
  const currency = "USD";

  let unitPrice = 0;
  let baseTotal = 0;
  let tourTitle = "";
  let transferLabel: string | null = null;
  let depositPercent = 0;
  let maxGroup = 20;
  let tourId: number | null = null;

  if (input.kind === "transfer" && input.transferRouteId) {
    const route = await queryOne<{
      destination: string;
      origin_label: string;
      price_1_5: number;
      price_6_11: number;
    }>(
      `SELECT destination, origin_label, price_1_5, price_6_11
       FROM transfer_routes WHERE id = ? AND is_published = 1`,
      input.transferRouteId,
    );
    if (!route) throw new Error("Transfer route not found");
    unitPrice = input.guests <= 5 ? route.price_1_5 : route.price_6_11;
    baseTotal = unitPrice;
    transferLabel = `${route.origin_label} → ${route.destination}`;
  } else if (input.tourId) {
    const tour = await queryOne<{
      price: number;
      price_unit: string;
      is_published: number;
      deposit_percent: number;
      max_group: number;
    }>(
      `SELECT price, price_unit, is_published, deposit_percent, max_group
       FROM tours WHERE id = ?`,
      input.tourId,
    );
    if (!tour || tour.is_published !== 1) throw new Error("Tour not found");

    const text = await queryOne<{ title: string }>(
      `SELECT title FROM tour_translations WHERE tour_id = ? AND locale = ?`,
      input.tourId,
      input.locale,
    );
    const fallback = text
      ? null
      : await queryOne<{ title: string }>(
          `SELECT title FROM tour_translations WHERE tour_id = ? LIMIT 1`,
          input.tourId,
        );

    // Precio por vehículo o grupo: se cobra una vez. Por persona: por huésped.
    baseTotal =
      tour.price_unit === "person" ? tour.price * input.guests : tour.price;
    unitPrice = tour.price;
    tourTitle = text?.title ?? fallback?.title ?? "";
    depositPercent = tour.deposit_percent ?? 0;
    maxGroup = tour.max_group ?? 20;
    tourId = input.tourId;
  } else {
    // Reserva personalizada: sin precio automático (lo fija el admin).
    tourTitle = input.locale === "es" ? "Tour personalizado" : "Custom tour";
  }

  // Capacidad: si hay fecha y tour, no se puede exceder el cupo del día.
  if (tourId && input.bookedFor && /^\d{4}-\d{2}-\d{2}$/.test(input.bookedFor)) {
    const { getBookedGuests } = await import("./availability");
    const booked = await getBookedGuests(tourId, input.bookedFor);
    const remaining = Math.max(0, (maxGroup || 20) - booked);
    if (input.guests > remaining) {
      const err = new Error("Sold out for this date") as Error & {
        code?: string;
        remaining?: number;
      };
      err.code = "sold-out";
      err.remaining = remaining;
      throw err;
    }
  }

  // Promo: primero el cupón personal (propiedad estricta), luego el genérico.
  let discount = 0;
  let promoId: number | null = null;
  let promoCode: string | null = null;
  let loyaltyCouponId: number | null = null;
  if (input.promoCode?.trim()) {
    const { checkCoupon } = await import("./loyalty");
    const personal = await checkCoupon(input.promoCode, input.userId ?? null, baseTotal);
    if (personal.ok) {
      discount = personal.discount;
      promoCode = personal.coupon.code;
      loyaltyCouponId = personal.coupon.id;
    } else {
      const { checkPromo } = await import("./promos");
      const checked = await checkPromo(input.promoCode, baseTotal);
      if (!checked.ok) {
        const err = new Error("Invalid promo") as Error & { code?: string };
        err.code = `promo-${checked.error}`;
        throw err;
      }
      discount = checked.discount;
      promoId = checked.promo.id;
      promoCode = checked.promo.code;
    }
  }

  const totalPrice = Math.round((baseTotal - discount) * 100) / 100;
  const depositDue =
    depositPercent > 0 ? Math.round(((totalPrice * depositPercent) / 100) * 100) / 100 : 0;

  return {
    unitPrice,
    totalPrice,
    currency,
    tourTitle,
    transferLabel,
    discount: Math.round(discount * 100) / 100,
    promoId,
    promoCode,
    loyaltyCouponId,
    depositDue,
  };
}

/** Crea la reserva y su primer evento. Devuelve la fila creada. */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const quote = await quoteBooking(input);

  let reference = "";
  let booking: Booking | null = null;

  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    reference = makeReference();
    try {
      await execute(
        `INSERT INTO bookings
           (reference, kind, tour_id, tour_slug, tour_title,
            transfer_route_id, transfer_label, user_id,
            customer_name, customer_email, customer_phone, customer_country,
            guests, unit_price, total_price, currency,
            promo_code, discount_amount, deposit_due,
            booked_for, pickup_time, hotel, airport, cruise_port, meeting_point,
            locale, notes, status, payment_status, source, client_ip)
         VALUES
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, ?)`,
        reference,
        input.kind,
        input.tourId ?? null,
        input.tourSlug ?? null,
        quote.tourTitle,
        input.transferRouteId ?? null,
        quote.transferLabel,
        input.userId ?? null,
        input.customerName,
        input.customerEmail,
        input.customerPhone,
        input.customerCountry ?? null,
        input.guests,
        quote.unitPrice,
        quote.totalPrice,
        quote.currency,
        quote.promoCode,
        quote.discount,
        quote.depositDue,
        input.bookedFor ?? null,
        input.pickupTime ?? null,
        input.hotel ?? null,
        input.airport ?? null,
        input.cruisePort ?? null,
        input.meetingPoint ?? null,
        input.locale,
        input.notes ?? null,
        input.source ?? "web",
        input.clientIp ?? null,
      );
      booking = await queryOne<Booking>(
        `SELECT * FROM bookings WHERE reference = ?`,
        reference,
      );
    } catch (err) {
      // Solo las colisiones de referencia justifican reintentar; cualquier
      // otro fallo (D1 caído, esquema) se registra y se propaga.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/UNIQUE constraint failed/i.test(msg)) {
        console.error("[bookings] createBooking error:", err);
        throw err;
      }
      booking = null;
    }
  }

  if (!booking) throw new Error("Could not create booking");

  if (quote.promoId) {
    const { consumePromoUse } = await import("./promos");
    await consumePromoUse(quote.promoId).catch((err) =>
      console.error("[bookings] consumePromoUse error:", err),
    );
  }
  if (quote.loyaltyCouponId) {
    const { consumeCoupon } = await import("./loyalty");
    await consumeCoupon(quote.loyaltyCouponId, booking.id).catch((err) =>
      console.error("[bookings] consumeCoupon error:", err),
    );
  }

  await execute(
    `INSERT INTO booking_events (booking_id, from_status, to_status, note, actor)
     VALUES (?, NULL, 'pending', ?, 'web')`,
    booking.id,
    "Reserva creada desde la web",
  );

  return booking;
}

/** Marca los flags de notificación (WhatsApp / email enviados). */
export async function markBookingNotified(
  id: number,
  channel: "whatsapp" | "email",
): Promise<void> {
  const column = channel === "whatsapp" ? "whatsapp_sent" : "email_sent";
  await execute(
    `UPDATE bookings SET ${column} = 1, updated_at = datetime('now') WHERE id = ?`,
    id,
  );
}

/**
 * Marca una reserva como pagada por completo (vía PayPal capturado). No usa la
 * sesión de staff: es la confirmación server-to-server del proveedor de pago.
 */
export async function markBookingPaidByReference(reference: string): Promise<void> {
  const booking = await getBookingByReference(reference);
  if (!booking) return;
  await execute(
    `UPDATE bookings
        SET payment_status = 'paid',
            deposit_paid = total_price,
            status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
            updated_at = datetime('now')
      WHERE id = ?`,
    booking.id,
  );
  await execute(
    `INSERT INTO booking_events (booking_id, from_status, to_status, note, actor)
     VALUES (?, ?, ?, ?, ?)`,
    booking.id,
    booking.status,
    booking.status === "pending" ? "confirmed" : booking.status,
    "Pago completado con PayPal",
    "system",
  );
}

// ───────────────────────────── Lectura (panel) ─────────────────────────────

export type BookingFilters = {
  status?: BookingStatus | "all";
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function countBookings(filters: BookingFilters): Promise<number> {
  const { where, params } = buildWhere(filters);
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM bookings ${where}`,
    ...params,
  );
  return row?.n ?? 0;
}

export async function listBookings(filters: BookingFilters): Promise<Booking[]> {
  const { where, params } = buildWhere(filters);
  const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 2000);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  return query<Booking>(
    `SELECT * FROM bookings ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );
}

function buildWhere(filters: BookingFilters): {
  where: string;
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.status && filters.status !== "all") {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.from) {
    clauses.push("date(created_at) >= date(?)");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("date(created_at) <= date(?)");
    params.push(filters.to);
  }
  if (filters.search) {
    clauses.push(
      `(reference LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR tour_title LIKE ?)`,
    );
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export async function getBookingById(id: number): Promise<Booking | null> {
  return queryOne<Booking>(`SELECT * FROM bookings WHERE id = ?`, id);
}

export async function getBookingByReference(
  reference: string,
): Promise<Booking | null> {
  return queryOne<Booking>(`SELECT * FROM bookings WHERE reference = ?`, reference);
}

/** Reservas de un cliente por su email (para "mis reservas"). */
export async function listBookingsByEmail(
  email: string,
  limit = 25,
): Promise<Booking[]> {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  return query<Booking>(
    `SELECT * FROM bookings WHERE customer_email = ? COLLATE NOCASE
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    email,
    safeLimit,
  );
}

export async function listBookingEvents(
  bookingId: number,
): Promise<BookingEvent[]> {
  return query<BookingEvent>(
    `SELECT * FROM booking_events WHERE booking_id = ? ORDER BY id ASC`,
    bookingId,
  );
}
