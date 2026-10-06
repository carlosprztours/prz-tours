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

  const motivo = (clave: string | undefined, porDefecto: string) => {
    const key = clave ? MOTIVOS[clave] : undefined;
    return (key ? labels.reasons?.[key] : undefined) ?? porDefecto;
  };

  const onChange = async (elegidos: FileList | null) => {
    const files = [...(elegidos ?? [])];
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);

    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      form.append("folder", folder);

      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const cuerpo = (await res.json().catch(() => ({}))) as {
        images?: Subida[];
        url?: string;
        failed?: { nombre: string; motivo: string }[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(motivo(cuerpo.error, labels.failed));
      }

      const imagenes: Subida[] = cuerpo.images?.length
        ? cuerpo.images
        : cuerpo.url
          ? [{ url: cuerpo.url, thumbnailUrl: null, fileId: null }]
          : [];
      if (imagenes.length === 0) throw new Error(labels.failed);

      // Las que no salieron se avisan, pero no se pierden las que sí.
      if (cuerpo.failed?.length) {
        setError(
          `${cuerpo.failed.length} no se pudieron subir (${motivo(
            cuerpo.failed[0]?.motivo,
            labels.failed,
          )}). Se añadieron las demás.`,
        );
      }

      if (onUploaded) {
        onUploaded(imagenes.map((i) => i.url));
      } else {
        const nombres = files.map((f) => f.name);
        escribirEnCampo(targetId, imagenes, nombres, imagenes.length === 1);
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
          ? labels.uploading
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