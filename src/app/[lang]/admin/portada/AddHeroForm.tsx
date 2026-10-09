/**
 * Portada del panel: carrusel hero de la home con subida a ImageKit.
 *
 * Sin slides publicados, la home muestra sus 5 imágenes de respaldo.
 */
"use client";

import { useActionState, useMemo, useState } from "react";

import { UploadButton } from "@/components/admin/UploadButton";
import { createHeroSlide, type SimpleResult } from "@/lib/admin/content";

const initialState: SimpleResult = { ok: false, error: "" };

export function AddHeroForm({ locale, es }: { locale: string; es: boolean }) {
  const action = useMemo(() => createHeroSlide.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [subidas, setSubidas] = useState<string[]>([]);
  const input =
    "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">
        {es ? "Agregar fotos al carrusel" : "Add carousel photos"}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <UploadButton
          targetId="hero-url"
          folder="hero"
          multiple
          onUploaded={(urls) => setSubidas(urls)}
          labels={
            es
              ? {
                  upload: "Subir fotos",
                  uploading: "Subiendo…",
                  failed: "No se pudo subir.",
                  reasons: {
                    notConfigured: "Falta configurar ImageKit.",
                    badType: "Formato no válido (JPG, PNG, WebP, AVIF o GIF).",
                    badSize: "Alguna foto supera los 30 MB.",
                    tooMany: "Máximo 20 fotos de golpe.",
                  },
                }
              : {
                  upload: "Upload photos",
                  uploading: "Uploading…",
                  failed: "Upload failed.",
                  reasons: {
                    notConfigured: "ImageKit is not configured.",
                    badType: "Unsupported format (JPG, PNG, WebP, AVIF or GIF).",
                    badSize: "One of the photos is larger than 30 MB.",
                    tooMany: "Up to 20 photos at a time.",
                  },
                }
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-ink-500 sm:col-span-2">
          {es ? "URL (/img/… o https://…)" : "URL (/img/… or https://…)"}
          <input id="hero-url" name="url" placeholder="/img/hero/mi-foto.jpg" className={input} readOnly={subidas.length > 0} />
        </label>
        {subidas.map((u) => (
          <input key={u} type="hidden" name="urls" value={u} />
        ))}
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Texto alternativo" : "Alt text"}
          <input name="alt" className={input} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Leyenda (opcional)" : "Caption (optional)"}
          <input name="caption" className={input} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Orden" : "Order"}
          <input name="sort_order" type="number" defaultValue={0} className={input} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-ink-900">
          <input type="checkbox" name="is_published" defaultChecked className="h-4 w-4" />
          {es ? "Publicado" : "Published"}
        </label>
      </div>
      {!state.ok && state.error && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {es ? "Sube al menos una foto o pega una URL." : "Upload at least one photo or paste a URL."}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-semibold text-emerald-600" role="status">
          {es ? "Agregada. Actualiza para verla." : "Added. Refresh to see it."}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-10 justify-self-start rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
      >
        {es ? "Agregar" : "Add"}
      </button>
    </form>
  );
}
