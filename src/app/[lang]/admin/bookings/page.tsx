/**
 * Lista de reservas con filtros (estado, texto, fechas) y paginación simple.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { adminTexts } from "@/lib/admin/texts";
import { countBookings, listBookings } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { BookingStatus, Locale } from "@/types";
import { DatePicker } from "@/components/ui/DatePicker";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    estado?: string;
    q?: string;
    desde?: string;
    hasta?: string;
    pagina?: string;
  }>;
};

const PAGE_SIZE = 25;

export default async function BookingsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const t = adminTexts(locale);
  const sp = await searchParams;

  const status = (["pending", "confirmed", "completed", "cancelled"].includes(sp.estado ?? "")
    ? sp.estado
    : "all") as BookingStatus | "all";
  const page = Math.max(1, Number(sp.pagina ?? "1") || 1);

  const filters = {
    status,
    search: sp.q?.trim() || undefined,
    from: sp.desde || undefined,
    to: sp.hasta || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [total, bookings] = await Promise.all([
    countBookings(filters),
    listBookings(filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const query = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    if (sp.estado) p.set("estado", sp.estado);
    if (sp.q) p.set("q", sp.q);
    if (sp.desde) p.set("desde", sp.desde);
    if (sp.hasta) p.set("hasta", sp.hasta);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return `/${locale}/admin/bookings${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {t.bookings} · {total}
        </h1>
        <span className="flex gap-2">
          <Link
            href={`/${locale}/admin/occupancy`}
            className="inline-flex h-10 items-center rounded-full border border-sand-200 bg-white px-4 text-sm font-bold text-ink-700 transition hover:ring-1 hover:ring-ocean-300"
          >
            {locale === "es" ? "Ocupación" : "Occupancy"}
          </Link>
          <a
            href={`/api/admin/export/bookings?${new URLSearchParams({
              ...(status !== "all" ? { estado: status } : {}),
              ...(sp.q ? { q: sp.q } : {}),
              ...(sp.desde ? { desde: sp.desde } : {}),
              ...(sp.hasta ? { hasta: sp.hasta } : {}),
            }).toString()}`}
            className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-4 text-sm font-bold text-white transition hover:bg-ocean-800"
          >
            CSV ↓
          </a>
        </span>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-sand-200 bg-white p-4">
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {t.status}
          <select name="estado" defaultValue={status} className="h-10 rounded-xl border border-sand-200 px-3 text-sm text-ink-900">
            <option value="all">{t.allStatuses}</option>
            <option value="pending">{t.statusPending}</option>
            <option value="confirmed">{t.statusConfirmed}</option>
            <option value="completed">{t.statusCompleted}</option>
            <option value="cancelled">{t.statusCancelled}</option>
          </select>
        </label>
        <label className="grid min-w-52 flex-1 gap-1 text-xs font-bold text-ink-500">
          {t.search}
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={t.search}
            className="h-10 rounded-xl border border-sand-200 px-3 text-sm font-normal text-ink-900"
          />
        </label>
        <span className="grid gap-1 text-xs font-bold text-ink-500">
          {t.date} ({t.dateFrom})
          <DatePicker
            id="f-desde"
            name="desde"
            locale={locale}
            defaultValue={sp.desde ?? ""}
            min={null}
            labels={{
              placeholder: t.pickDate,
              today: t.today,
              clear: t.clear,
              prevMonth: t.prevMonth,
              nextMonth: t.nextMonth,
            }}
          />
        </span>
        <span className="grid gap-1 text-xs font-bold text-ink-500">
          {t.date} ({t.dateTo})
          <DatePicker
            id="f-hasta"
            name="hasta"
            locale={locale}
            defaultValue={sp.hasta ?? ""}
            min={null}
            labels={{
              placeholder: t.pickDate,
              today: t.today,
              clear: t.clear,
              prevMonth: t.prevMonth,
              nextMonth: t.nextMonth,
            }}
          />
        </span>
        <button type="submit" className="h-10 rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800">
          {t.filter}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-sm md:hidden">
        <ul className="divide-y divide-sand-100">
          {bookings.map((b) => (
            <li key={b.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/${locale}/admin/bookings/${b.id}`} className="font-display text-base font-extrabold text-ocean-700">
                  {b.reference}
                </Link>
                <StatusBadge status={b.status} locale={locale} />
              </div>
              <p className="mt-1 text-sm font-semibold text-ink-900">{b.customer_name}</p>
              <p className="text-xs text-ink-500">{b.customer_phone}</p>
              <p className="mt-2 text-sm text-ink-700">
                {b.tour_title || b.transfer_label || "—"}
              </p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-500">
                  {[b.booked_for, `${b.guests} ${t.guests.toLowerCase()}`].filter(Boolean).join(" · ")}
                </span>
                <span className="font-display text-lg font-extrabold text-ink-900">
                  ${b.total_price}
                </span>
              </div>
            </li>
          ))}
          {bookings.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-ink-500">{t.noData}</li>
          )}
        </ul>
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">{t.reference}</th>
              <th className="px-4 py-3">{t.customer}</th>
              <th className="px-4 py-3">{t.experience}</th>
              <th className="px-4 py-3">{t.date}</th>
              <th className="px-4 py-3 text-right">{t.total}</th>
              <th className="px-4 py-3">{t.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {bookings.map((b) => (
              <tr key={b.id} className="transition hover:bg-sand-50">
                <td className="px-4 py-3">
                  <Link href={`/${locale}/admin/bookings/${b.id}`} className="font-bold text-ocean-700 hover:underline">
                    {b.reference}
                  </Link>
                  <p className="text-xs text-ink-500">{b.created_at.slice(0, 10)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{b.customer_name}</p>
                  <p className="text-xs text-ink-500">{b.customer_phone}</p>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {b.tour_title || b.transfer_label || "—"}
                  <p className="text-xs text-ink-500">
                    {b.guests} {t.guests.toLowerCase()}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-700">{b.booked_for ?? "—"}</td>
                <td className="px-4 py-3 text-right font-display font-extrabold text-ink-900">
                  ${b.total_price}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} locale={locale} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-500">
                  {t.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm font-bold">
          {page > 1 && (
            <Link href={query({ pagina: String(page - 1) })} className="rounded-full border border-sand-200 bg-white px-4 py-2 hover:ring-1 hover:ring-ocean-300">
              ←
            </Link>
          )}
          <span className="px-2 text-ink-600">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={query({ pagina: String(page + 1) })} className="rounded-full border border-sand-200 bg-white px-4 py-2 hover:ring-1 hover:ring-ocean-300">
              →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
