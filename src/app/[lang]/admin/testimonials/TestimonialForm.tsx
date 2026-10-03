/**
 * Formulario de testimonio (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import {
  createTestimonial,
  updateTestimonial,
  type SimpleResult,
} from "@/lib/admin/content";
import type { Testimonial } from "@/types";

const initialState: SimpleResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";

export function TestimonialForm({
  locale,
  initial,
  es,
}: {
  locale: string;
  initial: Testimonial | null;
  es: boolean;
}) {
  const action = useMemo(
    () =>
      initial
        ? updateTestimonial.bind(null, locale, initial.id)
        : createTestimonial.bind(null, locale),
    [locale, initial],
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {es ? "Autor" : "Author"}
          <input name="author_name" required defaultValue={initial?.author_name ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Origen (país)" : "Origin (country)"}
          <input name="author_origin" defaultValue={initial?.author_origin ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Estrellas (1–5)" : "Rating (1–5)"}
          <input name="rating" type="number" min={1} max={5} defaultValue={initial?.rating ?? 5} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Slug del tour (opcional)" : "Tour slug (optional)"}
          <input name="tour_slug" defaultValue={initial?.tour_slug ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Texto (español)" : "Text (Spanish)"}
          <textarea name="text_es" rows={4} required defaultValue={initial?.text_es ?? ""} className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-500" />
        </label>
        <label className={labelClass}>
          {es ? "Texto (inglés)" : "Text (English)"}
          <textarea name="text_en" rows={4} defaultValue={initial?.text_en ?? ""} className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-500" />
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
