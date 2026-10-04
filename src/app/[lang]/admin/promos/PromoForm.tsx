/**
 * Formulario de código promocional (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import {
  createPromo,
  updatePromo,
  type PromosResult,
} from "@/lib/admin/promos";
import type { PromoCode } from "@/types";

const initialState: PromosResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";

export function PromoForm({
  locale,
  initial,
  es,
}: {
  locale: string;
  initial: PromoCode | null;
  es: boolean;
}) {
  const action = useMemo(
    () =>
      initial
        ? updatePromo.bind(null, locale, initial.id)
        : createPromo.bind(null, locale),
    [locale, initial],
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {es ? "Código" : "Code"}
          <input name="code" required defaultValue={initial?.code ?? ""} placeholder="VERANO10" className={`${inputClass} uppercase`} />
        </label>
        <label className={labelClass}>
          {es ? "Tipo" : "Type"}
          <select name="kind" defaultValue={initial?.kind ?? "percent"} className={inputClass}>
            <option value="percent">{es ? "Porcentaje %" : "Percent %"}</option>
            <option value="amount">{es ? "Monto fijo $" : "Fixed amount $"}</option>
          </select>
        </label>
        <label className={labelClass}>
          {es ? "Valor" : "Value"}
          <input name="value" type="number" min={0} step={0.01} required defaultValue={initial?.value ?? 10} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Usos máximos (vacío = ilimitado)" : "Max uses (empty = unlimited)"}
          <input name="max_uses" type="number" min={1} defaultValue={initial?.max_uses ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Válido desde" : "Valid from"}
          <input name="valid_from" type="date" defaultValue={initial?.valid_from ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Válido hasta" : "Valid until"}
          <input name="valid_to" type="date" defaultValue={initial?.valid_to ?? ""} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-ink-900">
          <input type="checkbox" name="is_active" defaultChecked={(initial?.is_active ?? 1) === 1} className="h-4 w-4" />
          {es ? "Activo" : "Active"}
        </label>
      </div>
      {!state.ok && state.error && (
        <p className="text-sm font-semibold text-red-600" role="alert">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm font-semibold text-emerald-600" role="status">
          {es ? "Guardado." : "Saved."}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 justify-self-start rounded-full bg-ocean-700 px-7 text-sm font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
      >
        {es ? "Guardar" : "Save"}
      </button>
    </form>
  );
}
