/**
 * Botón para subir imágenes a ImageKit e insertar sus URLs en un textarea
 * (componente de cliente).
 *
 * Se usa en el editor de tours (campo de imágenes) y en la galería. La subida
 * va a `POST /api/admin/upload`, que es quien tiene la clave privada.
 *
 * Con `multiple` se pueden elegir varias fotos de golpe: se suben juntas y se
 * pega una línea por cada una, que es lo que evita subir de una en una.
 */
"use client";

import { useRef, useState } from "react";

type Props = {
  /** Id del <textarea> donde se agrega la línea `url | nombre`. */
  targetId: string;
  /** Carpeta dentro de ImageKit (tours, gallery, misc). */
  folder?: string;
  /** Permite elegir varias fotos de golpe. */
  multiple?: boolean;
  /** Al subir varias, esta función recibe las URLs en vez de escribirlas. */
  onUploaded?: (urls: string[]) => void;
  labels: {
    upload: string;
    uploading: string;
    failed: string;
    /** Motivos concretos, para no dejar al staff con un «error» seco. */
    reasons?: {
      notConfigured?: string;
      badType?: string;
      badSize?: string;
      tooMany?: string;
    };
  };
};

/** Motivos que devuelve la API, con su texto para el panel. */
const MOTIVOS: Record<string, keyof NonNullable<Props["labels"]["reasons"]>> = {
  "media-not-configured": "notConfigured",
  "bad-type": "badType",
  "bad-size": "badSize",
  "too-many": "tooMany",
};

/** Una imagen devuelta por la API. */
type Subida = { url: string; thumbnailUrl: string | null; fileId: string | null };

export function UploadButton({
  targetId,
  folder = "misc",
  multiple = false,
  onUploaded,
  labels,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const motivo = (clave: string | undefined, porDefecto: string) => {
    const key = clave ? MOTIVOS[clave] : undefined;
    return (key ? labels.reasons?.[key] : undefined) ?? porDefecto;
  };

  const onChange = async (elegidos: FileList | null) => {
    const files = [...(elegidos ?? [])];
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: files.length });

    try {
      if (files.length > 100) throw new Error("Máximo 100 archivos por selección.");
      const uploaded: Subida[] = [];
      const uploadedNames: string[] = [];
      const failures: string[] = [];
      // Una selección puede contener 100 archivos; cada petición respeta el límite de 20.
      for (let offset = 0; offset < files.length; offset += 20) {
        const batch = files.slice(offset, offset + 20);
        const form = new FormData();
        batch.forEach((file) => form.append("files", file));
        form.append("folder", folder);
        const res = await fetch("/api/admin/upload", { method: "POST", body: form });
        const body = (await res.json().catch(() => ({}))) as {
          images?: (Subida & { originalName?: string; originalIndex?: number })[];
          url?: string;
          failed?: { nombre: string; motivo: string; index?: number }[];
          error?: string;
        };
        if (!res.ok) {
          failures.push(`Lote ${Math.floor(offset / 20) + 1}: ${motivo(body.error, labels.failed)}`);
        } else {
          for (const image of body.images ?? []) {
            uploaded.push(image);
            uploadedNames.push(image.originalName ?? batch[image.originalIndex ?? -1]?.name ?? image.url);
          }
          for (const failed of body.failed ?? []) failures.push(`${failed.nombre}: ${motivo(failed.motivo, labels.failed)}`);
          if (!body.images?.length && body.url) {
            uploaded.push({ url: body.url, thumbnailUrl: null, fileId: null });
            uploadedNames.push(batch[0]?.name ?? body.url);
          }
        }
        setProgress({ done: Math.min(offset + batch.length, files.length), total: files.length });
      }
      if (uploaded.length === 0) throw new Error(failures.join("; ") || labels.failed);
      if (onUploaded) onUploaded(uploaded.map((image) => image.url));
      else escribirEnCampo(targetId, uploaded, uploadedNames, uploaded.length === 1);
      if (failures.length) setError(`${failures.length} errores: ${failures.slice(0, 3).join("; ")}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : labels.failed);
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime"
        multiple={multiple}
        className="hidden"
        aria-label={labels.upload}
        onChange={(e) => onChange(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-9 items-center rounded-full bg-ocean-100 px-4 text-xs font-bold text-ocean-800 transition hover:bg-ocean-200 disabled:opacity-60"
      >
        {busy
          ? `${labels.uploading} (${progress?.done ?? 0}/${progress?.total ?? 0})`
          : multiple
            ? `${labels.upload} · varias`
            : labels.upload}
      </button>
      {error && (
        <span className="text-xs font-semibold text-red-600" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

/**
 * Pega las URLs en el textarea o input indicado, una por línea.
 *
 * En un textarea se escribe `url | nombre`, que es el formato que espera el
 * campo de imágenes de los tours. Si solo se sube una, se respeta que el
 * textarea no estuviera vacío.
 */
function escribirEnCampo(
  targetId: string,
  imagenes: Subida[],
  nombresOriginales: string[],
  unaSola: boolean,
) {
  const target = document.getElementById(targetId) as
    | HTMLTextAreaElement
    | HTMLInputElement
    | null;
  if (!target) return;

  const lineas = imagenes.map(
    (imagen, i) => `${imagen.url} | ${(nombresOriginales[i] ?? imagen.url).replace(/\s+/g, " ")}`,
  );

  if (target instanceof HTMLTextAreaElement) {
    const actual = target.value.trim();
    target.value = actual ? `${actual}\n${lineas.join("\n")}` : lineas.join("\n");
  } else if (unaSola) {
    target.value = imagenes[0]?.url ?? "";
  } else {
    // Un input de una sola línea con varias fotos no cabe: se deja la primera
    // y el resto se ignoran, que es lo mejor que se puede hacer sin romper.
    target.value = imagenes[0]?.url ?? "";
  }
  target.dispatchEvent(new Event("change", { bubbles: true }));
}