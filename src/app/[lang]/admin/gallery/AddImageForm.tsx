/**
 * Formulario para agregar fotos a la galería (componente de cliente).
 *
 * Se pueden elegir varias de golpe: el botón las sube juntas y se crea una
 * ficha por cada una, con su URL. El texto alternativo y el pie de foto se
 * aplican a la primera; el resto se rellenan luego en la ficha de cada foto.
 */
"use client";

import { useActionState, useMemo, useState } from "react";

import { UploadButton } from "@/components/admin/UploadButton";
import { createGalleryImage, type SimpleResult } from "@/lib/admin/content";

const initialState: SimpleResult = { ok: false, error: "" };

/** La acción devuelve claves cortas; aquí se traducen para el staff. */
const ERRORES: Record<string, { es: string; en: string }> = {
  required: {
    es: "Sube al menos una foto o pega una URL.",
    en: "Upload at least one photo or paste a URL.",
  },
};

export function AddImageForm({ locale, es }: { locale: string; es: boolean }) {
  const action = useMemo(() => createGalleryImage.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  /** URLs ya subidas, a la espera de que se pulse «Agregar». */
  const [subidas, setSubidas] = useState<string[]>([]);
  /** Vídeos subidos junto con las fotos; van a su apartado. */
  const [subidasVideo, setSubidasVideo] = useState<string[]>([]);

  const esVideo = (u: string) => /\.(mp4|webm|mov)(\?|$)/i.test(u);
  const subirTodo = (urls: string[]) => {
    const imagenes = urls.filter((u) => !esVideo(u));
    const videos = urls.filter((u) => esVideo(u));
    setSubidas(imagenes);
    setSubidasVideo(videos);
  };

  const input =
    "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">
        {es ? "Agregar fotos" : "Add photos"}
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <UploadButton
          targetId="gallery-url"
          folder="gallery"
          multiple
          onUploaded={(urls) => subirTodo(urls)}
          labels={
            es
              ? {
                  upload: "Subir fotos",
                  uploading: "Subiendo…",
                  failed: "No se pudo subir.",
                  reasons: {
                    notConfigured: "Falta configurar ImageKit.",
                    badType: "Formato no válido (JPG, PNG, WebP, AVIF o GIF).",
                    badSize: "Alguna foto supera los 10 MB.",
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
                    badSize: "One of the photos is larger than 10 MB.",
                    tooMany: "Up to 20 photos at a time.",
                  },
                }
          }
        />
        <span className="text-xs text-ink-500">
          {es ? "elige varias de golpe" : "pick several at once"}
        </span>
      </div>

      {subidas.length > 0 || subidasVideo.length > 0 ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {es
            ? `${subidas.length} foto(s) y ${subidasVideo.length} vídeo(s) listos. Pulsa «Agregar» para guardarlos.`
            : `${subidas.length} photo(s) and ${subidasVideo.length} video(s) ready. Press “Add” to save them.`}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-ink-500 sm:col-span-2">
          {subidas.length > 0
            ? es
              ? `URL de ${subidas.length} foto(s) — no hace falta tocarla`
              : `URL of ${subidas.length} photo(s) — no need to edit it`
            : es
              ? "URL (/img/… o https://…)"
              : "URL (/img/… or https://…)"}
          {/* Sin `required`: con fotos ya subidas este campo se queda vacío a
              propósito, y el navegador bloquearía el envío sin llegar a la
              Server Action. Si no hay ninguna foto, lo avisa la acción. */}
          <input
            id="gallery-url"
            name="url"
            placeholder="/img/mi-foto.jpg"
            className={input}
            readOnly={subidas.length > 0 || subidasVideo.length > 0}
          />
        </label>

        {/* Las fotos subidas llegan en `urls`; los vídeos, en `video_urls`. */}
        {subidas.map((u) => (
          <input key={u} type="hidden" name="urls" value={u} />
        ))}
        {subidasVideo.map((u) => (
          <input key={u} type="hidden" name="video_urls" value={u} />
        ))}

        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Texto alternativo" : "Alt text"}
          <input name="alt" className={input} />
          <span className="text-[11px] font-normal text-ink-400">
            {es
              ? "Lo que leerá en voz alta quien no ve la foto. Si subes varias, solo se aplica a la primera."
              : "What a screen reader will announce. If you upload several, it only applies to the first one."}
          </span>
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
          {ERRORES[state.error]?.[es ? "es" : "en"] ?? state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-semibold text-emerald-600" role="status">
          {state.count && state.count > 1
            ? es
              ? `${state.count} fotos agregadas. Actualiza para verlas.`
              : `${state.count} photos added. Refresh to see them.`
            : es
              ? "Agregada. Actualiza para verla."
              : "Added. Refresh to see it."}
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