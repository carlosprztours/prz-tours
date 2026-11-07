/**
 * Dashboard del panel: tarjetas de métricas, ingresos por mes y por tour,
 * y actividad reciente.
 */
import Link from "next/link";
import { requireSection } from "@/lib/admin/access";
import { notFound, redirect } from "next/navigation";

import { adminTexts } from "@/lib/admin/texts";
import {
  getDashboardMetrics,
  getRecentBookings,
} from "@/lib/db/metrics";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AdminDashboard({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const { user } = await requireSection(locale, "panel");
  if (user.role === "driver") redirect(`/${locale}/admin/services`);
  if (user.role === "photographer") redirect(`/${locale}/admin/gallery`);
  const t = adminTexts(locale);

  const [metrics, recent] = await Promise.all([getDashboardMetrics(), getRecentBookings()]);
  const cards = [
    { label: t.pendingBookings, value: String(metrics.pendingBookings), hint: t.bookings },
    { label: t.totalGuests, value: String(metrics.totalGuests), hint: t.onlyConfirmedNote },
  ];

  return (
    <div className="grid grid-cols-1 gap-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{t.dashboard}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{card.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{card.value}</p>
            <p className="mt-1 text-xs text-ink-500">{card.hint}</p>
          </div>
        ))}
      </div>

      {user.role === "admin" && (
        <Link href={`/${locale}/admin/finance`} className="justify-self-start rounded-xl border border-sand-200 bg-white px-4 py-3 font-bold text-ocean-800">
          {locale === "es" ? "Resumen financiero" : "Financial summary"}
        </Link>
      )}

      <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">{t.recentBookings}</h2>
          <Link href={`/${locale}/admin/bookings`} className="text-sm font-bold text-ocean-700 hover:underline">
            {t.viewAll}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{t.noData}</p>
        ) : (
          <ul className="mt-3 divide-y divide-sand-100">
            {recent.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/${locale}/admin/bookings/${b.id}`} className="inline-block rounded-lg bg-ocean-50 px-2 py-0.5 font-mono text-sm font-bold text-ocean-800 ring-1 ring-inset ring-ocean-200 transition hover:bg-ocean-100 hover:ring-ocean-300" title={b.reference}>
                    {b.reference}
                  </Link>
                  <p className="truncate text-ink-500">
                    {b.customer_name} · {b.tour_title || b.transfer_label}
                  </p>
                </div>
                <span className="shrink-0 font-display font-extrabold text-ink-900">
                  ${b.total_price}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
