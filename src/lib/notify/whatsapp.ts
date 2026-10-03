/**
 * Enlaces de WhatsApp con mensaje pre-armado.
 *
 * Flujo de reserva: el formulario guarda la reserva en D1 y devuelve la URL
 * de WhatsApp; el cliente la abre en una pestaña nueva. Así el visitante
 * confirma por el canal que más convierte en RD, y nosotros ya tenemos la
 * reserva guardada con su referencia.
 */
import type { Locale } from "@/types";

/** Normaliza a solo dígitos (wa.me exige el número sin +, espacios ni guiones). */
export function normalizeWhatsappNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function whatsappLink(phone: string, message: string): string {
  const number = normalizeWhatsappNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export type BookingWhatsappData = {
  reference: string;
  tourTitle?: string;
  transferLabel?: string;
  date?: string | null;
  guests: number;
  name: string;
  total: number;
  currency?: string;
};

/** Mensaje que el cliente envía para confirmar su reserva. */
export function bookingConfirmationMessage(
  data: BookingWhatsappData,
  locale: Locale,
): string {
  const experience =
    data.tourTitle || data.transferLabel || (locale === "es" ? "tour" : "tour");
  const totalLine =
    data.total > 0
      ? locale === "es"
        ? `Total estimado: $${data.total} ${data.currency ?? "USD"}`
        : `Estimated total: $${data.total} ${data.currency ?? "USD"}`
      : locale === "es"
        ? "Total: precio a convenir"
        : "Total: price to be agreed";
  if (locale === "es") {
    const lines = [
      "Hola Perez Tours, quiero confirmar mi reserva.",
      "",
      `Referencia: ${data.reference}`,
      `Tour: ${experience}`,
    ];
    if (data.date) lines.push(`Fecha: ${data.date}`);
    lines.push(`Personas: ${data.guests}`);
    lines.push(`Nombre: ${data.name}`);
    lines.push(totalLine);
    lines.push("", "Quedo atento a la confirmación. Gracias.");
    return lines.join("\n");
  }
  const lines = [
    "Hi Perez Tours, I'd like to confirm my booking.",
    "",
    `Reference: ${data.reference}`,
    `Tour: ${experience}`,
  ];
  if (data.date) lines.push(`Date: ${data.date}`);
  lines.push(`Guests: ${data.guests}`);
  lines.push(`Name: ${data.name}`);
  lines.push(totalLine);
  lines.push("", "Looking forward to your confirmation. Thanks.");
  return lines.join("\n");
}

/** Mensaje que el negocio envía al notificar una reserva nueva (interno). */
export function newBookingAlertMessage(
  data: BookingWhatsappData & { phone: string; email: string },
): string {
  return [
    "Nueva reserva web",
    "",
    `Referencia: ${data.reference}`,
    `Tour: ${data.tourTitle || data.transferLabel || "-"}`,
    data.date ? `Fecha: ${data.date}` : null,
    `Personas: ${data.guests}`,
    `Cliente: ${data.name}`,
    `Tel: ${data.phone}`,
    `Email: ${data.email}`,
    `Total: $${data.total} ${data.currency ?? "USD"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type CustomerStatusData = {
  name: string;
  reference: string;
  experience: string;
  date?: string | null;
};

/**
 * Mensaje del negocio al cliente con la decisión (confirmada o declinada).
 * Se abre en WhatsApp con un clic desde el panel; el estado ya quedó
 * guardado en la BD y se refleja al instante en /account, /track y el panel.
 */
export function customerStatusMessage(
  data: CustomerStatusData,
  status: "confirmed" | "cancelled",
  locale: Locale,
): string {
  const dateLine = data.date
    ? locale === "es"
      ? `Fecha: ${data.date}`
      : `Date: ${data.date}`
    : null;

  if (locale === "es") {
    const head =
      status === "confirmed"
        ? `Hola ${data.name}, ¡tu reserva está CONFIRMADA!`
        : `Hola ${data.name}, lamentablemente no podremos tomar tu reserva.`;
    return [
      head,
      "",
      "Perez Tours & Transfers",
      `Referencia: ${data.reference}`,
      `Tour: ${data.experience}`,
      dateLine,
      "",
      status === "confirmed"
        ? "Te esperamos. Cualquier duda escríbenos por aquí."
        : "Escríbenos si quieres que te propongamos otra fecha u otro tour.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const head =
    status === "confirmed"
      ? `Hi ${data.name}, your booking is CONFIRMED!`
      : `Hi ${data.name}, unfortunately we won't be able to take your booking.`;
  return [
    head,
    "",
    "Perez Tours & Transfers",
    `Reference: ${data.reference}`,
    `Tour: ${data.experience}`,
    dateLine,
    "",
    status === "confirmed"
      ? "See you soon. Message us here with any questions."
      : "Message us if you'd like us to suggest another date or tour.",
  ]
    .filter(Boolean)
    .join("\n");
}
