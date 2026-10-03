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
};

export type BookingQuote = {
  unitPrice: number;
  totalPrice: number;
  currency: string;
  tourTitle: string;
  transferLabel: string | null;
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
    const unitPrice = input.guests <= 5 ? route.price_1_5 : route.price_6_11;
    return {
      unitPrice,
      totalPrice: unitPrice,
      currency,
      tourTitle: "",
      transferLabel: `${route.origin_label} → ${route.destination}`,
    };
  }

  if (input.tourId) {
    const tour = await queryOne<{
      price: number;
      price_unit: string;
      is_published: number;
    }>(`SELECT price, price_unit, is_published FROM tours WHERE id = ?`, input.tourId);
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
    const totalPrice =
      tour.price_unit === "person" ? tour.price * input.guests : tour.price;
    return {
      unitPrice: tour.price,
      totalPrice: Math.round(totalPrice * 100) / 100,
      currency,
      tourTitle: text?.title ?? fallback?.title ?? "",
      transferLabel: null,
    };
  }

  // Reserva personalizada: sin precio automático (lo fija el admin).
  return {
    unitPrice: 0,
    totalPrice: 0,
    currency,
    tourTitle: "",
    transferLabel: null,
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
            transfer_route_id, transfer_label,
            customer_name, customer_email, customer_phone, customer_country,
            guests, unit_price, total_price, currency,
            booked_for, pickup_time, hotel, airport, cruise_port, meeting_point,
            locale, notes, status, payment_status, source, client_ip)
         VALUES
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, ?)`,
        reference,
        input.kind,
        input.tourId ?? null,
        input.tourSlug ?? null,
        quote.tourTitle,
        input.transferRouteId ?? null,
        quote.transferLabel,
        input.customerName,
        input.customerEmail,
        input.customerPhone,
        input.customerCountry ?? null,
        input.guests,
        quote.unitPrice,
        quote.totalPrice,
        quote.currency,
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
    } catch {
      // Probable colisión de referencia: reintenta con una nueva.
      booking = null;
    }
  }

  if (!booking) throw new Error("Could not create booking");

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
  const limit = Math.min(filters.limit ?? 25, 100);
  const offset = filters.offset ?? 0;
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
  return query<Booking>(
    `SELECT * FROM bookings WHERE customer_email = ? COLLATE NOCASE
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    email,
    Math.min(limit, 100),
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
