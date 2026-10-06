/**
 * Formulario de crear/editar artículo (componente de cliente).
 */
"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createArticle,
  updateArticle,
  type AdminArticleFull,
  type ArticlesResult,
} from "@/lib/admin/articles";

const initialState: ArticlesResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";
const areaClass =
  "w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-ocean-500";

export function ArticleForm({
  locale,
  initial,
  es,
}: {
  locale: string;
  initial: AdminArticleFull | null;
  es: boolean;
}) {
  const [tab, setTab] = useState<"es" | "en">("es");
  const action = useMemo(
    () =>
      initial
        ? updateArticle.bind(null, locale, initial.article.id)
        : createArticle.bind(null, locale),
    [locale, initial],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const a = initial?.article;
  const tr = (loc: "es" | "en") => initial?.translations[loc];

  return (
    <form action={formAction} className="grid gap-5">
      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={`${labelClass} sm:col-span-2`}>
            Slug (URL)
            <input name="slug" required defaultValue={a?.slug ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            {es ? "Orden" : "Order"}
            <input name="sort_order" type="number" defaultValue={a?.sort_order ?? 0} className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            {es ? "Portada (URL)" : "Cover (URL)"}
            <input name="cover_url" defaultValue={a?.cover_url ?? ""} placeholder="/img/…" className={inputClass} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-ink-900">
            <input type="checkbox" name="is_published" defaultChecked={(a?.is_published ?? 0) === 1} className="h-4 w-4" />
            {es ? "Publicado" : "Published"}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">
            {es ? "Textos" : "Texts"}
          </h2>
          <div className="flex gap-1 rounded-full bg-sand-100 p-1">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setTab(l)}
                className={`rounded-full px-4 py-1 text-sm font-bold transition ${tab === l ? "bg-white shadow" : "text-ink-500"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {(["es", "en"] as const).map((l) => (
          <div key={l} className={`mt-4 grid gap-3 ${tab === l ? "" : "hidden"}`}>
            <label className={labelClass}>
              {es ? "Título" : "Title"} <span className="whitespace-nowrap">({l.toUpperCase()})</span>
              <input name={`title_${l}`} defaultValue={tr(l)?.title ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              {es ? "Resumen" : "Excerpt"} <span className="whitespace-nowrap">({l.toUpperCase()})</span>
              <input name={`excerpt_${l}`} defaultValue={tr(l)?.excerpt ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              {es ? "Contenido (párrafos separados por línea en blanco)" : "Body (paragraphs separated by blank lines)"} <span className="whitespace-nowrap">({l.toUpperCase()})</span>
              <textarea name={`body_${l}`} rows={10} defaultValue={tr(l)?.body ?? ""} className={areaClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                SEO title
                <input name={`seo_title_${l}`} defaultValue={tr(l)?.seo_title ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                SEO description
                <input name={`seo_description_${l}`} defaultValue={tr(l)?.seo_description ?? ""} className={inputClass} />
              </label>
            </div>
          </div>
        ))}
      </section>

      {!state.ok && state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
          {es ? "Guardado." : "Saved."}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 justify-self-start rounded-full bg-ocean-700 px-8 font-display text-base font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
      >
        {es ? "Guardar" : "Save"}
      </button>
    </form>
  );
}
