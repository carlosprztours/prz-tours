/**
 * Ficha editable de una foto de la galería (componente de cliente).
 *
 * Antes solo se podía añadir o borrar: si el texto alternativo estaba mal, la
 * única manera de arreglarlo era borrar la foto y volver a subirla. Aquí se
 * edita el texto alternativo, la leyenda, el orden y si está publicada.
 */
"use client";

import { useActionState, useMemo } from "react";

import { SafeImage } from "@/components/SafeImage";
import { updateGalleryImage, type SimpleResult } from "@/lib/admin/content";
import type { GalleryImage } from "@/types";

const initialState: SimpleResult = { ok: false, error: "" };

type Props = {
  image: GalleryImage;
  locale: string;
  es: boolean;
};

export function GalleryImageCard({ image, locale, es }: Props) {
  const action = useMemo(() => updateGalleryImage.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  const input =
    "h-9 w-full rounded-lg border border-sand-200 bg-white px-2.5 text-sm text-ink-900 outline-none focus:border-ocean-500";
  const etiqueta = "grid gap-1 text-[11px] font-bold text-ink-500";

  const altVacio = !image.alt?.trim();

  return (
    <figure className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <div className="relative aspect-square bg-sand-100">
        <SafeImage
          src={image.url}
          alt={image.alt || ""}
          fill
          sizes="25vw"
          className="object-cover"
          loading="lazy"
        />
        {image.is_published !== 1 && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
            {es ? "Oculta" : "Hidden"}
          </span>
        )}
      </div>

      <form action={formAction} className="grid gap-2 p-3">
        <input type="hidden" name="id" value={image.id} />
        <input type="hidden" name="url" value={image.url} />

        <label className={etiqueta}>
          <span className="flex items-center justify-between">
            {es ? "Texto alternativo" : "Alt text"}
            {altVacio && (
              <span className="font-semibold text-red-600">
                {es ? "falta" : "missing"}
              </span>
            )}
          </span>
          <input
            name="alt"
            defaultValue={image.alt ?? ""}
            placeholder={es ? "Qué se ve en la foto" : "What the photo shows"}
            className={input}
            aria-invalid={altVacio || undefined}
          />
        </label>

        <label className={etiqueta}>
          {es ? "Leyenda" : "Caption"}
          <input name="caption" defaultValue={image.caption ?? ""} className={input} />
        </label>

        <div className="flex items-end gap-2">
          <label className={`${etiqueta} w-20`}>
            {es ? "Orden" : "Order"}
            <input
              name="sort_order"
              type="number"
              defaultValue={image.sort_order ?? 0}
              className={input}
            />
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-xs font-bold text-ink-900">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={image.is_published === 1}
              className="h-4 w-4"
            />
            {es ? "Publicada" : "Published"}
          </label>
        </div>

        {state.ok && (
          <p className="text-xs font-semibold text-emerald-600" role="status">
            {es ? "Guardado" : "Saved"}
          </p>
        )}
        {!state.ok && state.error && (
          <p className="text-xs font-semibold text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-9 justify-self-start rounded-full bg-ocean-700 px-4 text-xs font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
        >
          {pending
            ? es
              ? "Guardando…"
              : "Saving…"
            : es
              ? "Guardar"
              : "Save"}
        </button>
      </form>
    </figure>
  );
}