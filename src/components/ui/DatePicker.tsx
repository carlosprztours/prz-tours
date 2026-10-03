/**
 * Selector de fecha con calendario propio (componente de cliente).
 *
 * Sustituye al `<input type="date">` nativo, cuya apariencia y ruedas
 * varían mucho entre navegadores y resultan incómodas. Este muestra un
 * calendario mensual localizado (nombres de mes y días según idioma),
 * respeta fecha mínima y guarda `AAAA-MM-DD` en un input oculto para que
 * el formulario lo envíe igual que antes.
 */
"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/types";

type Props = {
  id: string;
  name: string;
  locale: Locale;
  defaultValue?: string;
  /** Fecha mínima seleccionable (por defecto: hoy). null = sin límite. */
  min?: string | null;
  labels: {
    placeholder: string;
    today: string;
    clear: string;
    prevMonth: string;
    nextMonth: string;
  };
};

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(v: string | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function todayISO(): string {
  return toISO(new Date());
}

export function DatePicker({ id, name, locale, defaultValue, min, labels }: Props) {
  const minISO = min === null ? null : (min ?? todayISO());
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const [open, setOpen] = useState(false);

  const selected = parseISO(value);
  const initial = selected ?? parseISO(minISO ?? "") ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const tag = locale === "es" ? "es-DO" : "en-US";
  const firstDay = locale === "es" ? 1 : 0; // lunes en ES, domingo en EN

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const offset = (first.getDay() - firstDay + 7) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const list: ({ date: Date; iso: string; outside: boolean } | null)[] = [];
    for (let i = 0; i < offset; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      list.push({ date, iso: toISO(date), outside: false });
    }
    return list;
  }, [viewYear, viewMonth, firstDay]);

  const weekdays = useMemo(() => {
    // 2026-01-04 fue domingo; se generan 7 días desde firstDay.
    const base = new Date(2026, 0, 4 + firstDay);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(tag, { weekday: "short" }).format(d);
    });
  }, [tag, firstDay]);

  const title = new Intl.DateTimeFormat(tag, {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  const shown = selected
    ? new Intl.DateTimeFormat(tag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selected)
    : "";

  const move = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <span className="relative block" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-sand-200 bg-white px-4 text-left text-sm text-ink-900 outline-none transition focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
      >
        <span className={shown ? "font-semibold" : "text-ink-500/60"}>
          {shown || labels.placeholder}
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ocean-600" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <>
          <span
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <span
            role="dialog"
            aria-label={title}
            className="absolute left-0 top-full z-50 mt-2 w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl border border-sand-200 bg-white p-4 shadow-2xl"
          >
            <span className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={labels.prevMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-ink-700 transition hover:bg-sand-100"
              >
                ‹
              </button>
              <strong className="font-display text-sm font-bold capitalize text-ink-900">
                {title}
              </strong>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={labels.nextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-ink-700 transition hover:bg-sand-100"
              >
                ›
              </button>
            </span>

            <span className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-ink-500">
              {weekdays.map((w, i) => (
                <span key={i} className="py-1">{w}</span>
              ))}
            </span>
            <span className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((cell, i) =>
                cell === null ? (
                  <span key={`x${i}`} />
                ) : (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={minISO !== null && cell.iso < minISO}
                    onClick={() => {
                      setValue(cell.iso);
                      setOpen(false);
                    }}
                    aria-pressed={cell.iso === value}
                    className={`flex h-9 items-center justify-center rounded-full text-sm transition ${
                      cell.iso === value
                        ? "bg-ocean-600 font-bold text-white"
                        : minISO !== null && cell.iso < minISO
                          ? "cursor-not-allowed text-ink-500/30"
                          : "font-medium text-ink-700 hover:bg-ocean-50"
                    }`}
                  >
                    {cell.date.getDate()}
                  </button>
                ),
              )}
            </span>

            <span className="mt-3 flex justify-between border-t border-sand-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setOpen(false);
                }}
                className="text-xs font-bold text-ink-500 transition hover:text-red-600"
              >
                {labels.clear}
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = todayISO();
                  if (minISO === null || t >= minISO) setValue(t);
                  setOpen(false);
                }}
                className="text-xs font-bold text-ocean-700 transition hover:text-ocean-800"
              >
                {labels.today}
              </button>
            </span>
          </span>
        </>
      )}
    </span>
  );
}
