/**
 * Formulario de alta de categoría de tour (ES obligatorio, EN opcional:
 * si se deja vacío se auto-traduce al guardar).
 */
"use client";

import { useActionState, useMemo } from "react";

import { createTourCategory, type CategoryResult } from "@/lib/admin/categories";
import type { Locale } from "@/types";

type Props = {
  locale: Locale;
  labels: {
    name: string;
    nameEn: string;
    slug: string;
    slugHint: string;
    icon: string;
    submit: string;
    errors: Record<string, string>;
  };
};

const initialState: CategoryResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";

export function CategoryForm({ locale, labels }: Props) {
  const action = useMemo(() => createTourCategory.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5 sm:grid-cols-2"
    >
      <label className={labelClass}>
        {labels.name}
        <input name="label_es" required minLength={2} placeholder={labels.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        {labels.nameEn}
        <input name="label_en" placeholder={labels.nameEn} className={inputClass} />
      </label>
      <label className={labelClass}>
        {labels.slug}
        <input name="slug" placeholder={labels.slug} className={inputClass} />
        <span className="text-[11px] font-normal text-ink-400">{labels.slugHint}</span>
      </label>
      <label className={labelClass}>
        {labels.icon}
        <input name="icon" defaultValue="✨" maxLength={4} placeholder="✨" className={inputClass} />
      </label>

      {!state.ok && state.error && (
        <p role="alert" className="sm:col-span-2 text-sm font-bold text-red-600">
          {labels.errors[state.error] ?? state.error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full bg-coral-700 px-5 text-sm font-bold text-white transition hover:bg-coral-800 disabled:opacity-50"
        >
          {pending ? "…" : labels.submit}
        </button>
      </div>
    </form>
  );
}