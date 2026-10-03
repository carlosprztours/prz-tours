/**
 * Consulta tu reserva: introduce la referencia (PRZ-XXXXXX) y el email.
 *
 * Se exigen ambos para no exponer datos de otros clientes.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { getBookingByReference } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string; email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "es" ? "Consulta tu reserva" : "Track your booking",
    robots: { index: false, follow: false },
  };
}

export default async function TrackPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";
  const sp = await searchParams;

  const ref = (sp.ref ?? "").trim().toUpperCase();
  const email = (sp.email ?? "").trim().toLowerCase();

  let booking = null;
  let notFoundError = false;
  if (ref && email) {
    const found = await getBookingByReference(ref);
    if (found && found.customer_email.toLowerCase() === email) {
      booking = found;
    } else {
      notFoundError = true;
    }
  }

  const copy = {
    title: es ? "Consulta tu reserva" : "Track your booking",
    subtitle: es
      ? "Escribe tu referencia y tu correo para ver el estado."
      : "Enter your reference and email to see the status.",
    refLabel: es ? "Referencia (PRZ-XXXXXX)" : "Reference (PRZ-XXXXXX)",
    emailLabel: es ? "Correo de la reserva" : "Booking email",
    submit: es ? "Consultar" : "Look up",
    notFound: es
      ? "No encontramos una reserva con esos datos. Revisa la referencia y el correo."
      : "We couldn't find a booking with those details. Check the reference and email.",
    guests: es ? "personas" : "guests",
    total: es ? "Total" : "Total",
    date: es ? "Fecha" : "Date",
  };

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site max-w-xl">
        <h1 className="text-center font-display text-3xl font-extrabold text-ink-900">
          {copy.title}
        </h1>
        <p className="mt-2 text-center text-sm text-ink-500">{copy.subtitle}</p>

        <form
          method="get"
          className="mt-8 grid gap-3 rounded-2xl border border-sand-200 bg-white p-6"
        >
          <label className="grid gap-1 text-xs font-bold text-ink-500">
            {copy.refLabel}
            <input
              name="ref"
              required
              defaultValue={ref}
              placeholder="PRZ-XXXXXX"
              autoComplete="off"
              className="h-12 rounded-xl border border-sand-200 px-4 font-mono text-sm uppercase outline-none focus:border-ocean-500"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-ink-500">
            {copy.emailLabel}
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              autoComplete="email"
              className="h-12 rounded-xl border border-sand-200 px-4 text-sm outline-none focus:border-ocean-500"
            />
          </label>
          <button
            type="submit"
            className="h-12 rounded-full bg-ocean-700 font-display text-base font-bold text-white transition hover:bg-ocean-800"
          >
            {copy.submit}
          </button>
        </form>

        {notFoundError && (
          <p className="mt-4 rounded-2xl bg-red-50 px-5 py-4 text-center text-sm font-semibold text-red-700" role="alert">
            {copy.notFound}
          </p>
        )}

        {booking && (
          <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-2xl font-extrabold text-ink-900">
                {booking.reference}
              </p>
              <StatusBadge status={booking.status} locale={locale} />
            </div>
            <p className="mt-2 font-semibold text-ink-900">
              {booking.tour_title || booking.transfer_label || "—"}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase text-ink-500">{copy.date}</dt>
                <dd className="font-semibold">{booking.booked_for ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-ink-500">{copy.guests}</dt>
                <dd className="font-semibold">{booking.guests}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-ink-500">{copy.total}</dt>
                <dd className="font-semibold">
                  ${booking.total_price} {booking.currency}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-ink-500">Hotel</dt>
                <dd className="font-semibold">{booking.hotel || "—"}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
