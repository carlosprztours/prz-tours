/**
 * Selector de hora con franjas predefinidas (componente de cliente).
 *
 * Sustituye al `<input type="time">` nativo por una lista de horarios
 * típicos de recogida (7:00 AM – 6:00 PM cada 30 min), mucho más cómoda en
 * el móvil que las rueditas del sistema. Guarda `HH:MM` (24 h) en un input
 * oculto.
 */
"use client";

import { useState } from "react";

import type { Locale } from "@/types";

type Props = {
  id: string;
  name: string;
  locale: Locale;
  defaultValue?: string;
  labels: {
    placeholder: string;
    clear: string;
  };
};

function buildSlots(): string[] {
  const out: string[] = [];
  for (let h = 7; h <= 18; h++) {
    for (const m of [0, 30]) {
      if (h === 18 && m === 30) break;
      out.push(`${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
    }
  }
  return out;
}

const SLOTS = buildSlots();

export function TimePicker({ id, name, locale, defaultValue, labels }: Props) {
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const [open, setOpen] = useState(false);

  const tag = locale === "es" ? "es-DO" : "en-US";
  const shown = value
    ? new Intl.DateTimeFormat(tag, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(`2000-01-01T${value}:00`))
    : "";

  return (
    <span className="relative block" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-sand-200 bg-white px-4 text-left text-sm text-ink-900 outline-none transition focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
      >
        <span className={shown ? "font-semibold" : "text-ink-500/60"}>
          {shown || labels.placeholder}
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ocean-600" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7v5l3 2" />
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
            role="listbox"
            aria-label={labels.placeholder}
            className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full min-w-[200px] overflow-y-auto rounded-2xl border border-sand-200 bg-white p-2 shadow-2xl"
          >
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm transition ${
                value === "" ? "bg-ocean-600 font-bold text-white" : "text-ink-500 hover:bg-sand-100"
              }`}
            >
              {labels.clear}
            </button>
            {SLOTS.map((slot) => {
              const label = new Intl.DateTimeFormat(tag, {
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(`2000-01-01T${slot}:00`));
              return (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={slot === value}
                  onClick={() => {
                    setValue(slot);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm transition ${
                    slot === value
                      ? "bg-ocean-600 font-bold text-white"
                      : "font-medium text-ink-700 hover:bg-ocean-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </span>
        </>
      )}
    </span>
  );
}
