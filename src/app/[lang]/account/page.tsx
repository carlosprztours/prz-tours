/**
 * Mi cuenta: datos del cliente y sus reservas (por email de la cuenta).
 *
 * Requiere sesión (cualquier rol). El staff también puede entrar aquí.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { logout } from "@/lib/actions/auth";
import { verifyCustomerSession } from "@/lib/auth/dal";
import { listBookingsByEmail } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const session = await verifyCustomerSession(locale);
  const bookings = await listBookingsByEmail(session.user.email);

  const es = locale === "es";
  const copy = {
    title: es ? "Mi cuenta" : "My account",
    hello: es ? "Hola" : "Hi",
    myBookings: es ? "Mis reservas" : "My bookings",
    noBookings: es
      ? "Todavía no tienes reservas con este correo."
      : "You have no bookings with this email yet.",
    explore: es ? "Explorar tours" : "Explore tours",
    signOut: es ? "Cerrar sesión" : "Sign out",
    guests: es ? "personas" : "guests",
    panel: es ? "Ir al panel" : "Go to panel",
  };
  const isStaff = session.user.role === "admin" || session.user.role === "editor";

  return (
    <div className="bg-sand-50/50 py-12">
      <div className="container-site max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink-900">
              {copy.hello}, {session.user.name}
            </h1>
            <p className="mt-1 text-sm text-ink-500">{session.user.email}</p>
          </div>
          <div className="flex gap-2">
            {isStaff && (
              <Link
                href={`/${locale}/admin`}
                className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
              >
                {copy.panel}
              </Link>
            )}
            <form action={logout.bind(null, locale)}>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-full border border-sand-200 bg-white px-5 text-sm font-bold text-ink-700 transition hover:ring-1 hover:ring-ocean-300"
              >
                {copy.signOut}
              </button>
            </form>
          </div>
        </div>

        <h2 className="mt-10 font-display text-xl font-extrabold text-ink-900">
          {copy.myBookings} · {bookings.length}
        </h2>

        {bookings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-8 text-center">
            <p className="text-sm text-ink-500">{copy.noBookings}</p>
            <Link
              href={`/${locale}/tours`}
              className="mt-4 inline-flex h-11 items-center rounded-full bg-coral-500 px-6 text-sm font-bold text-white transition hover:bg-coral-600"
            >
              {copy.explore}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-5"
              >
                <div>
                  <p className="font-display text-lg font-extrabold text-ink-900">
                    {b.reference}
                  </p>
                  <p className="text-sm text-ink-700">
                    {b.tour_title || b.transfer_label || "—"}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {[b.booked_for, `${b.guests} ${copy.guests}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} locale={locale} />
                  <span className="font-display text-xl font-extrabold text-ink-900">
                    ${b.total_price}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
