/**
 * Correos de cambios de estado de una reserva (confirmada, cancelada, pagada).
 *
 * Antes esto solo avisaba por la campana de la web y por push. El cliente pide
 * ademas que toda reserva, cancelacion y confirmacion quede registrada por
 * correo, asi que desde aqui tambien se manda el correo al cliente.
 *
 * La copia interna NO se pide: `sendEmail` la anade sola en copia oculta a
 * `notify_emails` (buzon del dominio + personal), asi que estos correos tambien
 * dejan constancia en los tres sitios sin duplicar nada.
 */
import "server-only";

import type { Locale } from "@/types";

import { definitionRow, emailLayout, escapeHtml, sendEmail } from "./email";

/** Datos minimos de la reserva que aparecen en el correo. */
type BookingLike = {
  reference: string;
  customer_name: string;
  customer_email: string;
  tour_title?: string | null;
  transfer_label?: string | null;
  booked_for?: string | null;
  pickup_time?: string | null;
  guests?: number | null;
  total_price?: number | null;
  currency?: string | null;
};

export type BookingMailKind = "confirmed" | "cancelled" | "paid" | "partial";

/**
 * Manda el correo del cambio de estado. Nunca lanza: si Resend falla, el cambio
 * de estado ya esta guardado en la base de datos y no debe romperse.
 */
export async function sendBookingUpdateEmail(
  booking: BookingLike,
  kind: BookingMailKind,
  locale: Locale = "es",
): Promise<boolean> {
  if (!booking.customer_email) return false;

  const es = locale === "es";
  const t = TEMPLATES[kind];
  const experience = booking.tour_title || booking.transfer_label || "";

  const rows = [
    experience ? definitionRow(es ? "Experiencia" : "Experience", experience) : "",
    booking.booked_for ? definitionRow(es ? "Fecha" : "Date", booking.booked_for) : "",
    booking.pickup_time
      ? definitionRow(es ? "Hora de recogida" : "Pickup time", booking.pickup_time)
      : "",
    booking.guests ? definitionRow(es ? "Personas" : "Guests", String(booking.guests)) : "",
    booking.total_price != null
      ? definitionRow(
          es ? "Total estimado" : "Estimated total",
          `$${booking.total_price} ${booking.currency ?? ""}`.trim(),
        )
      : "",
    definitionRow(es ? "Referencia" : "Reference", booking.reference),
  ].join("");

  const html = emailLayout(
    t.title[es ? "es" : "en"],
    `<p style="font-size:14px;color:#334155;">` +
      `${es ? "Hola" : "Hi"} ${escapeHtml(booking.customer_name)},</p>` +
      `<p style="font-size:14px;color:#334155;">${t.intro[es ? "es" : "en"]}</p>` +
      rows +
      `<p style="margin:20px 0 0;font-size:14px;color:#334155;">` +
      `${
        es
          ? "Responde a este correo o escribenos por WhatsApp si necesitas cambiar algo."
          : "Reply to this email or message us on WhatsApp if you need to change anything."
      }</p>`,
  );

  const result = await sendEmail({
    to: booking.customer_email,
    subject: `${t.subject} · ${booking.reference}`,
    html,
  }).catch(() => null);

  return result?.sent === true;
}

/** Textos de cada tipo de aviso. */
const TEMPLATES: Record<
  BookingMailKind,
  { subject: string; title: { es: string; en: string }; intro: { es: string; en: string } }
> = {
  confirmed: {
    subject: "Reserva confirmada",
    title: { es: "Tu reserva esta confirmada", en: "Your booking is confirmed" },
    intro: {
      es: "Todo listo. Te esperamos para vivir la experiencia.",
      en: "All set. We look forward to welcoming you.",
    },
  },
  cancelled: {
    subject: "Reserva cancelada",
    title: { es: "Tu reserva fue cancelada", en: "Your booking was cancelled" },
    intro: {
      es: "Si no fuiste tu, escribenos de inmediato para revisarlo.",
      en: "If this wasn't you, contact us right away so we can review it.",
    },
  },
  paid: {
    subject: "Pago recibido",
    title: { es: "Recibimos tu pago", en: "We received your payment" },
    intro: {
      es: "Tu reserva queda totalmente pagada. Gracias por confiar en nosotros.",
      en: "Your booking is now fully paid. Thank you for trusting us.",
    },
  },
  partial: {
    subject: "Pago parcial recibido",
    title: { es: "Registramos tu pago parcial", en: "We recorded your partial payment" },
    intro: {
      es: "Anotamos el pago en tu reserva. Queda pendiente el resto.",
      en: "We noted the payment on your booking. The remainder is still pending.",
    },
  },
};