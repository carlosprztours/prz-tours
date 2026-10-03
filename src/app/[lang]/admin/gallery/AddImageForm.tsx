/**
 * Formulario para agregar una foto a la galería (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import { UploadButton } from "@/components/admin/UploadButton";
import {
  createGalleryImage,
  type SimpleResult,
} from "@/lib/admin/content";

const initialState: SimpleResult = { ok: false, error: "" };

export function AddImageForm({ locale, es }: { locale: string; es: boolean }) {
  const action = useMemo(() => createGalleryImage.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const input =
    "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">
        {es ? "Agregar foto" : "Add photo"}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <UploadButton
          targetId="gallery-url"
          folder="gallery"
          labels={
            es
              ? { upload: "Subir foto", uploading: "Subiendo…", failed: "No se pudo subir." }
              : { upload: "Upload photo", uploading: "Uploading…", failed: "Upload failed." }
          }
        />
        <span className="text-xs text-ink-500">{es ? "o pega una URL" : "or paste a URL"}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-ink-500 sm:col-span-2">
          URL (/img/… o https://…)
          <input id="gallery-url" name="url" required placeholder="/img/mi-foto.jpg" className={input} />
        </label>
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
        <p className="text-sm font-semibold text-red-600" role="alert">{state.error}</p>
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
