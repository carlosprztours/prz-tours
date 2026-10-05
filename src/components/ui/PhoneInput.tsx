/**
 * Teléfono con selector de país (componente de cliente).
 *
 * Selector de código de área + número local. Guarda en un input oculto el
 * valor E.164 (`+18090000000`), que es lo que viaja en el formulario y lo
 * que usa el enlace de WhatsApp para confirmar la reserva al cliente.
 */
"use client";

import { useState } from "react";

import { COUNTRY_DIALS, splitPhone } from "@/lib/validation/phone";
import type { Locale } from "@/types";

type Props = {
  id: string;
  name: string;
  locale: Locale;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
};

const boxClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export function PhoneInput({
  id,
  name,
  locale,
  defaultValue,
  required,
  autoComplete = "tel",
  placeholder,
}: Props) {
  const initial = splitPhone(defaultValue);
  const initialIndex = Math.max(
    0,
    COUNTRY_DIALS.findIndex((c) => c.code === initial.dial),
  );
  const [index, setIndex] = useState(initialIndex);
  const [customDial, setCustomDial] = useState("");
  const [number, setNumber] = useState(initial.number);
  const other = index === COUNTRY_DIALS.length;
  const dial = other
    ? `+${customDial.replace(/\D/g, "").slice(0, 4)}`
    : COUNTRY_DIALS[index].code;
  const full = `${dial}${number.replace(/\D/g, "")}`;

  return (
    <span className="flex gap-2">
      <select
        aria-label={locale === "es" ? "Código de país" : "Country code"}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="h-12 w-[7.5rem] shrink-0 cursor-pointer rounded-xl border border-sand-200 bg-white px-2 text-sm font-semibold text-ink-900 outline-none transition focus:border-ocean-500"
      >
        {COUNTRY_DIALS.map((c, i) => (
          <option key={`${c.code}-${c.label}`} value={i}>
            {c.flag} {c.code}
          </option>
        ))}
        <option value={COUNTRY_DIALS.length}>{locale === "es" ? "Otro +" : "Other +"}</option>
      </select>
      <input type="hidden" name={name} value={full} />
      {other && (
        <input
          aria-label={locale === "es" ? "Código de país" : "Country code"}
          value={customDial}
          onChange={(e) => setCustomDial(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Code"
          inputMode="numeric"
          className="h-12 w-20 shrink-0 rounded-xl border border-sand-200 bg-white px-3 text-sm font-semibold outline-none focus:border-ocean-500"
        />
      )}
      <input
        id={id}
        type="tel"
        required={required}
        autoComplete={autoComplete}
        value={number}
        onChange={(e) => setNumber(e.target.value.replace(/[^\d\s().-]/g, ""))}
        placeholder={placeholder ?? "809 000 0000"}
        className={boxClass}
      />
    </span>
  );
}
