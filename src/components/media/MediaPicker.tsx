/**
 * Selector de ficheros ya subidos a ImageKit (mini galería).
 *
 * En vez de obligar a subir de nuevo una foto o un vídeo que ya está en
 * ImageKit, este botón abre una rejilla con lo que ya tienes subido y permite
 * elegirlo. Se usa en el formulario de tour y en el alta de vídeos.
 */
"use client";

import { useEffect, useState } from "react";

type MediaFile = {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string | null;
  type: string;
  filePath: string;
};

type Props = {
  /** Qué tipos se muestran: solo imágenes, solo vídeos o todo. */
  kind?: "image" | "video" | "all";
  /** Carpeta inicial de ImageKit (tours, gallery, misc, "" = todo). */
  folder?: string;
  label: string;
  /** Se llama con las URLs elegidas. */
  onPick: (urls: string[]) => void;
};

const ES_VIDEO = /\.(mp4|webm|mov)(\?|$)/i;

export function MediaPicker({ kind = "image", folder = "tours", label, onPick }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [carpeta, setCarpeta] = useState(folder);
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    const cargar = async () => {
      try {
        const r = await fetch(`/api/admin/media?folder=${encodeURIComponent(carpeta)}`);
        const d = (await r.json()) as { files?: MediaFile[]; error?: string };
        if (!vivo) return;
        if (d.error) setError(d.error);
        setFiles(d.files ?? []);
      } catch {
        if (vivo) setError("load-failed");
      } finally {
        if (vivo) setCargando(false);
      }
    };
    cargar();
    return () => {
      vivo = false;
    };
  }, [abierto, carpeta]);

  /** Abre el modal y resetea la selección para no arrastrar la anterior. */
  const abrir = () => {
    setSeleccion(new Set());
    setError(null);
    setFiles(null);
    setCargando(true);
    setAbierto(true);
  };

  const cambiarCarpeta = (c: string) => {
    setCarpeta(c);
    setSeleccion(new Set());
    setError(null);
    setFiles(null);
    setCargando(true);
  };

  const visibles = (files ?? []).filter((f) => {
    const esVideo = f.type?.startsWith("video/") || ES_VIDEO.test(f.filePath || f.url);
    if (kind === "image") return !esVideo;
    if (kind === "video") return esVideo;
    return true;
  });

  const toggle = (url: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(url)) n.delete(url);
      else n.add(url);
      return n;
    });

  const confirmar = () => {
    onPick([...seleccion]);
    setAbierto(false);
    setSeleccion(new Set());
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex h-9 items-center rounded-full bg-ocean-50 px-4 text-xs font-bold text-ocean-800 transition hover:bg-ocean-100"
      >
        {label}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && setAbierto(false)}
        >
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-extrabold text-ink-900">
                {kind === "video" ? "Elige un vídeo de ImageKit" : "Elige fotos de ImageKit"}
              </h3>
              <button type="button" onClick={() => setAbierto(false)} className="text-sm font-bold text-ink-500">
                Cerrar ✕
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <select
                value={carpeta}
                onChange={(e) => cambiarCarpeta(e.target.value)}
                className="h-9 rounded-xl border border-sand-200 px-2 text-sm"
              >
                <option value="tours">tours</option>
                <option value="gallery">gallery</option>
                <option value="misc">misc</option>
                <option value="">todo</option>
              </select>
              <p className="text-xs text-ink-500">{visibles.length} fichero(s)</p>
            </div>

            <div className="mt-4 grid max-h-[55vh] grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">
              {cargando && <p className="col-span-4 text-sm text-ink-500">Cargando…</p>}
              {!cargando && error && <p className="col-span-4 text-sm text-red-600">{error}</p>}
              {!cargando &&
                visibles.map((f) => {
                  const esVideo = f.type?.startsWith("video/") || ES_VIDEO.test(f.filePath || f.url);
                  const sel = seleccion.has(f.url);
                  return (
                    <button
                      key={f.fileId}
                      type="button"
                      onClick={() => toggle(f.url)}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                        sel ? "border-ocean-600" : "border-transparent"
                      }`}
                      title={f.name}
                    >
                      {esVideo ? (
                        <div className="grid h-full w-full place-items-center bg-ocean-900 text-center text-[10px] font-bold text-white">
                          ▶<br />{f.name.split(".").pop()}
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.thumbnailUrl ?? f.url} alt={f.name} className="h-full w-full object-cover" />
                      )}
                      {sel && <span className="absolute right-1 top-1 rounded-full bg-ocean-600 px-1.5 text-xs text-white">✓</span>}
                    </button>
                  );
                })}
              {!cargando && !error && visibles.length === 0 && (
                <p className="col-span-4 text-sm text-ink-500">No hay ficheros aquí todavía.</p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAbierto(false)} className="h-9 rounded-full border border-sand-200 px-4 text-sm font-bold text-ink-600">
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={seleccion.size === 0}
                className="h-9 rounded-full bg-ocean-700 px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                Añadir seleccionadas ({seleccion.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
