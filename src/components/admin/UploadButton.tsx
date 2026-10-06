/**
 * Botón para subir una imagen a ImageKit e insertar su URL en un textarea
 * (componente de cliente).
 *
 * Se usa en el editor de tours (campo de imágenes) y en la galería. La subida
 * va a `POST /api/admin/upload`, que es quien tiene la clave privada.
 */
"use client";

import { useRef, useState } from "react";

type Props = {
  /** Id del <textarea> donde se agrega la línea `url | nombre`. */
  targetId: string;
  /** Carpeta dentro de ImageKit (tours, gallery, misc). */
  folder?: string;
  labels: {
    upload: string;
    uploading: string;
    failed: string;
    /** Motivos concretos, para no dejar al staff con un «error» seco. */
    reasons?: {
      notConfigured?: string;
      badType?: string;
      badSize?: string;
    };
  };
};

/** Motivos que devuelve la API, con su texto para el panel. */
const MOTIVOS: Record<string, keyof NonNullable<Props["labels"]["reasons"]>> = {
  "media-not-configured": "notConfigured",
  "bad-type": "badType",
  "bad-size": "badSize",
};

export function UploadButton({ targetId, folder = "misc", labels }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const reason = ((await res.json().catch(() => ({}))) as { error?: string })
          .error;
        const key = reason ? MOTIVOS[reason] : undefined;
        const specific = key ? labels.reasons?.[key] : undefined;
        throw new Error(specific ?? labels.failed);
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error(labels.failed);

      const target = document.getElementById(targetId) as
        | HTMLTextAreaElement
        | HTMLInputElement
        | null;
      if (target) {
        if (target instanceof HTMLTextAreaElement) {
          const line = `${data.url} | ${file.name.replace(/\s+/g, " ")}`;
          target.value = target.value.trim()
            ? `${target.value.trim()}\n${line}`
            : line;
        } else {
          target.value = data.url;
        }
        target.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.failed);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        aria-label={labels.upload}
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-9 items-center rounded-full bg-ocean-100 px-4 text-xs font-bold text-ocean-800 transition hover:bg-ocean-200 disabled:opacity-60"
      >
        {busy ? labels.uploading : labels.upload}
      </button>
      {error && (
        <span className="text-xs font-semibold text-red-600" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}