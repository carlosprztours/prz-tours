/**
 * Alta de vídeos en la galería (componente de cliente).
 *
 * El vídeo se sube a ImageKit vía `/api/admin/upload`; el campo "dónde se ve"
 * decide si aparece en la galería pública o en la página de una ruta concreta.
 * No se reproduce solo: la publicación espera a que alguien pulse play.
 */
"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { createGalleryVideo, type SimpleResult } from "@/lib/admin/content";

const initialState: SimpleResult = { ok: false, error: "" };

type Tour = { slug: string; title: string };

export function AddVideoForm({
  locale,
  es,
  tours,
}: {
  locale: string;
  es: boolean;
  tours: Tour[];
}) {
  const action = useMemo(() => createGalleryVideo.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [url, setUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [placement, setPlacement] = useState("gallery");
  const inputFile = useRef<HTMLInputElement>(null);

  const input =
    "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";

  const subir = async (archivo: File | undefined) => {
    if (!archivo || subiendo) return;
    setSubiendo(true);
    setErrorSubida(null);
    try {
      const form = new FormData();
      form.append("files", archivo);
      form.append("folder", "videos");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const cuerpo = (await res.json().catch(() => ({}))) as {
        images?: { url: string }[];
        url?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(cuerpo.error ?? "upload-failed");
      const subida = cuerpo.images?.[0]?.url ?? cuerpo.url;
      if (!subida) throw new Error("upload-failed");
      setUrl(subida);
    } catch (e) {
      setErrorSubida(e instanceof Error ? e.message : "upload-failed");
    } finally {
      setSubiendo(false);
      if (inputFile.current) inputFile.current.value = "";
    }
  };

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">
        {es ? "Agregar vídeo" : "Add video"}
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputFile}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => subir(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={subiendo}
          onClick={() => inputFile.current?.click()}
          className="h-9 rounded-full bg-ocean-100 px-4 text-xs font-bold text-ocean-800 hover:bg-ocean-200 disabled:opacity-60"
        >
          {subiendo ? (es ? "Subiendo…" : "Uploading…") : (es ? "Subir vídeo" : "Upload video")}
        </button>
        {url && (
          <span className="text-xs font-semibold text-emerald-600" role="status">
            {es ? "Vídeo listo: pulsa «Agregar»" : "Video ready: press “Add”"}
          </span>
        )}
        {errorSubida && (
          <span className="text-xs font-semibold text-red-600" role="alert">{errorSubida}</span>
        )}
      </div>

      <input type="hidden" name="url" value={url} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Título" : "Title"}
          <input name="title" className={input} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Pie (opcional)" : "Caption (optional)"}
          <input name="caption" className={input} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Poster (URL opcional)" : "Poster (optional URL)"}
          <input name="poster" placeholder="https://…" className={input} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Dónde se ve" : "Where it appears"}
          <select
            name="placement"
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            className={input}
          >
            <option value="gallery">{es ? "Galería pública" : "Public gallery"}</option>
            <option value="tour">{es ? "Página de una ruta" : "A route page"}</option>
          </select>
        </label>
        {placement === "tour" && (
          <label className="grid gap-1 text-xs font-bold text-ink-500 sm:col-span-2">
            {es ? "Ruta" : "Route"}
            <select name="tour_slug" className={input}>
              {tours.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        )}
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
          {state.error === "required"
            ? es
              ? "Sube un vídeo o pega una URL."
              : "Upload a video or paste a URL."
            : state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-semibold text-emerald-600" role="status">
          {es ? "Agregado. Actualiza para verlo." : "Added. Refresh to see it."}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !url}
        className="h-10 justify-self-start rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
      >
        {es ? "Agregar" : "Add"}
      </button>
    </form>
  );
}
