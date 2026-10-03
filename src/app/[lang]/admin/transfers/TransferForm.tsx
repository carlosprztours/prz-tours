/**
 * Formulario de ruta de traslado (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import {
  createRoute,
  updateRoute,
  type TransfersResult,
} from "@/lib/admin/transfers";
import type { TransferRoute } from "@/types";

const initialState: TransfersResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";

export function TransferForm({
  locale,
  initial,
  es,
}: {
  locale: string;
  initial: TransferRoute | null;
  es: boolean;
}) {
  const action = useMemo(
    () =>
      initial
        ? updateRoute.bind(null, locale, initial.id)
        : createRoute.bind(null, locale),
    [locale, initial],
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {es ? "Código origen (POP, SDQ…)" : "Origin code (POP, SDQ…)"}
          <input name="origin_key" required defaultValue={initial?.origin_key ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Etiqueta de origen" : "Origin label"}
          <input name="origin_label" required defaultValue={initial?.origin_label ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Aeropuerto (opcional)" : "Airport (optional)"}
          <input name="origin_airport" defaultValue={initial?.origin_airport ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Destino(s)" : "Destination(s)"}
          <input name="destination" required defaultValue={initial?.destination ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Precio 1–5 personas" : "Price 1–5 people"}
          <input name="price_1_5" type="number" min={0} step={0.01} required defaultValue={initial?.price_1_5 ?? 0} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Precio 6–11 personas" : "Price 6–11 people"}
          <input name="price_6_11" type="number" min={0} step={0.01} required defaultValue={initial?.price_6_11 ?? 0} className={inputClass} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          {es ? "Nota de precio (opcional)" : "Price note (optional)"}
          <input name="price_note" defaultValue={initial?.price_note ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Orden" : "Order"}
          <input name="sort_order" type="number" defaultValue={initial?.sort_order ?? 0} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-ink-900">
          <input type="checkbox" name="is_published" defaultChecked={(initial?.is_published ?? 1) === 1} className="h-4 w-4" />
          {es ? "Publicado" : "Published"}
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
