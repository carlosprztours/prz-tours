/**
 * Ocupación del panel: calendario mensual con personas por día y desglose.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSection } from "@/lib/admin/access";
import { getDayBreakdown, getMonthOccupancy } from "@/lib/db/availability";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ mes?: string; dia?: string }>;
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(ym: string, locale: Locale): string {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "es" ? "es-DO" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

export default async function OccupancyPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "occupancy");
  const es = locale === "es";
  const sp = await searchParams;

  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : currentMonth();
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? sp.dia! : null;

  const [days, breakdown] = await Promise.all([
    getMonthOccupancy(mes),
    dia ? getDayBreakdown(dia) : Promise.resolve([]),
  ]);
  const byDate = new Map(days.map((d) => [d.date, d]));

  const [y, m] = mes.split("-").map(Number);
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`),
  ];

  const link = (over: Record<string, string>) => {
    const p = new URLSearchParams({ mes });
    if (dia) p.set("dia", dia);
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/${locale}/admin/occupancy?${p.toString()}`;
  };

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Ocupación" : "Occupancy"}
        </h1>
        <span className="flex items-center gap-2">
          <Link
            href={link({ mes: shiftMonth(mes, -1), dia: "" })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-200 bg-white text-lg font-bold hover:ring-1 hover:ring-ocean-300"
            aria-label="←"
          >
            ‹
          </Link>
          <strong className="min-w-36 text-center font-display capitalize">{monthTitle(mes, locale)}</strong>
          <Link
            href={link({ mes: shiftMonth(mes, 1), dia: "" })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-200 bg-white text-lg font-bold hover:ring-1 hover:ring-ocean-300"
            aria-label="→"
          >
            ›
          </Link>
        </span>
      </div>

      <div className="rounded-2xl border border-sand-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase text-ink-500">
          {(es ? ["L", "M", "X", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"]).map((d, i) => (
            <span key={i} className="py-1">{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <span key={`x${i}`} />;
            const info = byDate.get(date);
            const active = dia === date;
            return (
              <Link
                key={date}
                href={link({ dia: active ? "" : date })}
                aria-current={active ? "true" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-1 text-center transition ${
                  active
                    ? "border-ocean-600 bg-ocean-600 text-white"
                    : info
                      ? "border-ocean-200 bg-ocean-50 hover:ring-1 hover:ring-ocean-300"
                      : "border-sand-100 bg-white hover:bg-sand-50"
                }`}
              >
                <span className="text-xs font-bold">{Number(date.slice(8))}</span>
                {info && (
                  <span className={`text-[11px] font-extrabold ${active ? "text-white" : "text-ocean-700"}`}>
                    {info.guests} 👥
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {dia && (
        <section className="rounded-2xl border border-sand-200 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink-900">{dia}</h2>
          {breakdown.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">{es ? "Sin reservas activas." : "No active bookings."}</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand-100">
              {breakdown.map((row, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-semibold text-ink-900">{row.tour_title}</span>
                  <span className="text-ink-600">
                    {row.guests} 👥 · {row.bookings} {es ? "reservas" : "bookings"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
