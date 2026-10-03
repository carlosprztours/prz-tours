/**
 * Dashboard del panel: tarjetas de métricas, ingresos por mes y por tour,
 * y actividad reciente.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { adminTexts } from "@/lib/admin/texts";
import {
  getDashboardMetrics,
  getRecentBookings,
  getRevenueByMonth,
  getRevenueByTour,
} from "@/lib/db/metrics";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

function money(n: number): string {
  return `$${(Math.round(n * 100) / 100).toLocaleString("en-US")}`;
}

export default async function AdminDashboard({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const t = adminTexts(locale);

  const [metrics, byMonth, byTour, recent] = await Promise.all([
    getDashboardMetrics(),
    getRevenueByMonth(),
    getRevenueByTour(),
    getRecentBookings(),
  ]);

  const delta =
    metrics.lastMonthRevenue > 0
      ? ((metrics.monthRevenue - metrics.lastMonthRevenue) /
          metrics.lastMonthRevenue) *
        100
      : null;

  const cards = [
    { label: t.totalRevenue, value: money(metrics.totalRevenue), hint: t.onlyConfirmedNote },
    {
      label: t.monthRevenue,
      value: money(metrics.monthRevenue),
      hint: delta === null ? t.vsLastMonth : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% ${t.vsLastMonth}`,
    },
    { label: t.pendingBookings, value: String(metrics.pendingBookings), hint: t.bookings },
    { label: t.totalGuests, value: String(metrics.totalGuests), hint: t.onlyConfirmedNote },
  ];

  const maxMonth = Math.max(1, ...byMonth.map((r) => r.revenue));
  const maxTour = Math.max(1, ...byTour.map((r) => r.revenue));

  return (
    <div className="grid gap-6">
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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ink-900">{t.revenueByMonth}</h2>
          {byMonth.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">{t.noData}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byMonth.map((row) => (
                <li key={row.month}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-bold text-ink-900">{row.month}</span>
                    <span className="text-ink-600">
                      {money(row.revenue)} · {row.bookings}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-100">
                    <div
                      className="h-full rounded-full bg-ocean-600"
                      style={{ width: `${Math.max(2, (row.revenue / maxMonth) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ink-900">{t.revenueByTour}</h2>
          {byTour.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">{t.noData}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byTour.map((row) => (
                <li key={`${row.tour_slug}-${row.tour_title}`}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-bold text-ink-900">{row.tour_title}</span>
                    <span className="shrink-0 text-ink-600">
                      {money(row.revenue)} · {row.bookings}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-100">
                    <div
                      className="h-full rounded-full bg-coral-500"
                      style={{ width: `${Math.max(2, (row.revenue / maxTour) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

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
                  <Link href={`/${locale}/admin/bookings/${b.id}`} className="font-bold text-ink-900 hover:text-ocean-700 hover:underline">
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
