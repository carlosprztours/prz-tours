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
    lines.push(`Total estimado: $${data.total} ${data.currency ?? "USD"}`);
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
  lines.push(`Estimated total: $${data.total} ${data.currency ?? "USD"}`);
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
