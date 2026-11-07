import { isSuperAdminEmail, requireSection } from "@/lib/admin/access";
/**
 * Detalle de reserva: datos del cliente, experiencia, totales, historial y
 * acciones de estado/pago.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { adminTexts } from "@/lib/admin/texts";
import { getBookingById, listBookingEvents, listBookingsByEmail } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { BookingActions } from "./BookingActions";
import { updateBookingReporting } from "@/lib/admin/booking-reporting";
import { listBookingReportingEvents, PROTECTED_BOOKING_REFERENCES } from "@/lib/db/booking-reporting";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Props = {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ reporting?: string }>;
};

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const t = adminTexts(locale);
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const { user } = await requireSection(locale, "bookings");
  const es = locale === "es";
  const { reporting } = await searchParams;
  const canExclude = user.role === "admin" && isSuperAdminEmail(user.email);
  const booking = await getBookingById(numericId);
  if (!booking) notFound();
  const [events, history, reportingEvents] = await Promise.all([
    listBookingEvents(booking.id),
    listBookingsByEmail(booking.customer_email, 10),
    listBookingReportingEvents(booking.id),
  ]);
  const others = history.filter((h) => h.id !== booking.id);

  const rows: [string, string][] = [
    [t.reference, booking.reference],
    [t.customer, booking.customer_name],
    [t.email, booking.customer_email],
    [t.phone, booking.customer_phone || "—"],
    [t.country, booking.customer_country || "—"],
    [t.experience, booking.tour_title || booking.transfer_label || "—"],
    [t.guests, String(booking.guests)],
    [t.date, booking.booked_for ?? "—"],
    [t.hotel, booking.hotel || "—"],
    [t.cruisePort, booking.cruise_port || "—"],
    [t.shipName, booking.cruise_ship || "—"],
    [t.total, `$${booking.total_price} ${booking.currency}`],
    [t.created, booking.created_at],
  ];

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={`/${locale}/admin/bookings${booking.archived_at ? "?archivo=1" : ""}`} className="shrink-0 text-sm font-bold text-ocean-700 hover:underline">
          ← {t.back}
        </Link>
        <h1 className="truncate font-display text-2xl font-extrabold text-ink-900">
          {t.bookingDetail} {booking.reference}
        </h1>
        <StatusBadge status={booking.status} locale={locale} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 content-start gap-5">
          <section className="min-w-0 rounded-2xl border border-sand-200 bg-white p-5">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
            {booking.notes && (
              <div className="mt-4 border-t border-sand-100 pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{t.notes}</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-700">{booking.notes}</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-sand-200 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-ink-900">{t.history}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 border-b border-sand-100 pb-2 last:border-0">
                  <span className="text-ink-700">
                    {e.from_status ? `${e.from_status} → ` : ""}
                    <strong>{e.to_status}</strong>
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">{e.created_at}</span>
                </li>
              ))}
              {events.length === 0 && <li className="text-ink-500">{t.noData}</li>}
            </ul>
          </section>

          {others.length > 0 && (
            <section className="rounded-2xl border border-sand-200 bg-white p-5">
              <h2 className="font-display text-lg font-bold text-ink-900">
                {locale === "es" ? "Otras reservas del cliente" : "Other bookings by this customer"}
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/${locale}/admin/bookings/${o.id}`}
                      className="flex items-center justify-between gap-3 border-b border-sand-100 pb-2 font-semibold text-ocean-700 hover:underline last:border-0"
                    >
                      <span>
                        {o.reference} · {o.tour_title || o.transfer_label || "—"}
                      </span>
                      <span className="shrink-0 text-ink-600">
                        {o.status} · ${o.total_price}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-sand-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="mb-3 font-display text-lg font-bold text-ink-900">{t.actions}</h2>
          {!booking.archived_at && <BookingActions
            locale={locale}
            bookingId={booking.id}
            status={booking.status}
            payment={booking.payment_status}
            customer={{
              name: booking.customer_name,
              phone: booking.customer_phone,
              reference: booking.reference,
              experience: booking.tour_title || booking.transfer_label || "—",
              date: booking.booked_for,
              locale: booking.locale,
            }}
            labels={
              locale === "es"
                ? {
                    confirm: "Confirmar",
                    complete: "Completar",
                    cancel: "Cancelar",
                    reopen: "Reabrir",
                    markPaid: "Marcar pagada",
                    markPartial: "Pago parcial",
                    markUnpaid: "Sin pagar",
                    confirmWhatsapp: "✅ Confirmar por WhatsApp",
                    declineWhatsapp: "Declinar por WhatsApp",
                    done: "Listo.",
                    failed: "No se pudo aplicar el cambio.",
                  }
                : {
                    confirm: "Confirm",
                    complete: "Complete",
                    cancel: "Cancel",
                    reopen: "Reopen",
                    markPaid: "Mark paid",
                    markPartial: "Partial payment",
                    markUnpaid: "Unpaid",
                    confirmWhatsapp: "✅ Confirm on WhatsApp",
                    declineWhatsapp: "Decline on WhatsApp",
                    done: "Done.",
                    failed: "Could not apply the change.",
                  }
            }
          />}
          <section className="mt-5 grid gap-3 border-t border-sand-200 pt-4">
            <h3 className="font-bold">{es ? "Archivo e informes" : "Archive and reports"}</h3>
            {booking.archived_at && <p>{es ? "Archivada" : "Archived"} · {booking.archived_at} UTC</p>}
            {user.role === "admin" && booking.excluded_from_reports_at && <p>{es ? "Excluida de informes" : "Excluded from reports"}</p>}
            {reporting && <p role="status">{reporting === "saved" ? (es ? "Cambio guardado." : "Change saved.")
              : reporting === "invalid" ? (es ? "Escribe un motivo válido." : "Enter a valid reason.")
              : (es ? "No se aplicó ningún cambio." : "No change applied.")}</p>}
            {PROTECTED_BOOKING_REFERENCES.includes(booking.reference) ? (
              <p>{es ? "Reserva protegida." : "Protected booking."}</p>
            ) : (
              <>
                <ReportingForm locale={locale} id={booking.id} action={booking.archived_at ? "restore" : "archive"} />
                {canExclude && <ReportingForm locale={locale} id={booking.id} action={booking.excluded_from_reports_at ? "include" : "exclude"} />}
              </>
            )}
            <ul className="grid gap-2 text-sm">
              {reportingEvents.filter((event) => user.role === "admin" || event.action === "archive" || event.action === "restore").map((event) => (
                <li key={event.id}>
                  <strong>{reportingLabel(locale, event.action)}</strong> · {event.created_at} UTC · {event.actor_label}<br />{event.reason}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function reportingLabel(locale: Locale, action: "archive" | "restore" | "exclude" | "include") {
  return locale === "es"
    ? { archive: "Archivar", restore: "Restaurar", exclude: "Excluir de informes", include: "Reincorporar a informes" }[action]
    : { archive: "Archive", restore: "Restore", exclude: "Exclude from reports", include: "Include in reports" }[action];
}

function ReportingForm({ locale, id, action }: { locale: Locale; id: number; action: "archive" | "restore" | "exclude" | "include" }) {
  return (
    <form action={updateBookingReporting.bind(null, locale, id, action)} className="grid gap-2">
      <label className="grid gap-1 text-sm">{locale === "es" ? "Motivo" : "Reason"} · {reportingLabel(locale, action)}
        <input name="reason" required maxLength={240} className="rounded-lg border border-sand-300 px-2 py-1" />
      </label>
      <button className="justify-self-start rounded-lg border border-ocean-600 px-3 py-2 text-sm font-semibold text-ocean-800">
        {reportingLabel(locale, action)}
      </button>
    </form>
  );
}
