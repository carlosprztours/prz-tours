/**
 * Formulario de pregunta frecuente (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import {
  createFaq,
  updateFaq,
  type FaqsResult,
} from "@/lib/admin/faqs";
import type { Faq } from "@/types";

const initialState: FaqsResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";

export function FaqForm({
  locale,
  initial,
  es,
}: {
  locale: string;
  initial: Faq | null;
  es: boolean;
}) {
  const action = useMemo(
    () =>
      initial
        ? updateFaq.bind(null, locale, initial.id)
        : createFaq.bind(null, locale),
    [locale, initial],
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {es ? "Pregunta (ES)" : "Question (ES)"}
          <input name="question_es" required defaultValue={initial?.question_es ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Pregunta (EN)" : "Question (EN)"}
          <input name="question_en" defaultValue={initial?.question_en ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {es ? "Respuesta (ES)" : "Answer (ES)"}
          <textarea name="answer_es" rows={4} required defaultValue={initial?.answer_es ?? ""} className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-500" />
        </label>
        <label className={labelClass}>
          {es ? "Respuesta (EN)" : "Answer (EN)"}
          <textarea name="answer_en" rows={4} defaultValue={initial?.answer_en ?? ""} className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-500" />
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
