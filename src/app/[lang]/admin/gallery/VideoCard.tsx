/**
 * Ficha editable de un vídeo: título, pie, poster, dónde se ve y si se publica.
 */
"use client";

import { useActionState, useMemo, useState } from "react";

import { updateGalleryVideo, type SimpleResult } from "@/lib/admin/content";
import type { GalleryVideo } from "@/types";

const initialState: SimpleResult = { ok: false, error: "" };

type Tour = { slug: string; title: string };

export function VideoCard({
  video,
  locale,
  es,
  tours,
}: {
  video: GalleryVideo;
  locale: string;
  es: boolean;
  tours: Tour[];
}) {
  const action = useMemo(() => updateGalleryVideo.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [placement, setPlacement] = useState(video.placement);

  const input =
    "h-9 w-full rounded-lg border border-sand-200 bg-white px-2.5 text-sm text-ink-900 outline-none focus:border-ocean-500";
  const etiqueta = "grid gap-1 text-[11px] font-bold text-ink-500";

  return (
    <figure className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <div className="aspect-video bg-black">
        <video src={video.url} poster={video.poster ?? undefined} controls preload="metadata" className="h-full w-full" />
      </div>
      <form action={formAction} className="grid gap-2 p-3">
        <input type="hidden" name="id" value={video.id} />

        <label className={etiqueta}>
          {es ? "Título" : "Title"}
          <input name="title" defaultValue={video.title} className={input} />
        </label>
        <label className={etiqueta}>
          {es ? "Pie" : "Caption"}
          <input name="caption" defaultValue={video.caption ?? ""} className={input} />
        </label>
        <label className={etiqueta}>
          {es ? "Poster (URL)" : "Poster (URL)"}
          <input name="poster" defaultValue={video.poster ?? ""} className={input} />
        </label>

        <label className={etiqueta}>
          {es ? "Dónde se ve" : "Where it appears"}
          <select name="placement" value={placement} onChange={(e) => setPlacement(e.target.value as "gallery" | "tour")} className={input}>
            <option value="gallery">{es ? "Galería pública" : "Public gallery"}</option>
            <option value="tour">{es ? "Página de una ruta" : "A route page"}</option>
          </select>
        </label>
        {placement === "tour" && (
          <label className={etiqueta}>
            {es ? "Ruta" : "Route"}
            <select name="tour_slug" defaultValue={video.tour_slug ?? ""} className={input}>
              {tours.map((t) => (
                <option key={t.slug} value={t.slug}>{t.title}</option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-end gap-2">
          <label className={`${etiqueta} w-20`}>
            {es ? "Orden" : "Order"}
            <input name="sort_order" type="number" defaultValue={video.sort_order ?? 0} className={input} />
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-xs font-bold text-ink-900">
            <input type="checkbox" name="is_published" defaultChecked={video.is_published === 1} className="h-4 w-4" />
            {es ? "Publicado" : "Published"}
          </label>
        </div>

        {state.ok && <p className="text-xs font-semibold text-emerald-600" role="status">{es ? "Guardado" : "Saved"}</p>}
        {!state.ok && state.error && <p className="text-xs font-semibold text-red-600" role="alert">{state.error}</p>}

        <button type="submit" disabled={pending} className="h-9 justify-self-start rounded-full bg-ocean-700 px-4 text-xs font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60">
          {pending ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar" : "Save")}
        </button>
      </form>
    </figure>
  );
}
