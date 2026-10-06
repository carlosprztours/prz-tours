/**
 * Subida de imágenes a ImageKit.
 *
 * ImageKit sustituye a R2 como almacén y CDN de las imágenes que sube el panel:
 * la cuenta de Cloudflare está en plan `free` sin R2, así que ahí no hay donde
 * guardarlas. ImageKit además optimiza y sirve en varios formatos.
 *
 * Se sube **desde el servidor** (no desde el navegador) a propósito: la clave
 * privada nunca llega al cliente.
 *
 * Credenciales (Dashboard → Developer Options → API Keys):
 *   IMAGEKIT_PRIVATE_KEY    clave privada, solo en el servidor
 *   IMAGEKIT_URL_ENDPOINT   p. ej. https://ik.imagekit.io/abc123xyz
 *
 * La clave pública no hace falta: con autenticación por clave privada el
 * endpoint de subida ya valida la cuenta.
 */
import "server-only";

import { getEnvVar } from "@/lib/db/client";

/** Tipos que aceptamos. ImageKit optimiza y sirve el resto igual. */
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/** 10 MB. Por encima, ImageKit lo rechaza y no aporta nada en una web. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Lo que devuelve `POST /api/admin/upload`. */
export type UploadResult = {
  /** URL pública en ImageKit, lista para `next/image`. */
  url: string;
  /** Miniatura que devuelve ImageKit, por si el panel la quiere. */
  thumbnailUrl: string | null;
  /** Identificador del fichero dentro de ImageKit. */
  fileId: string | null;
  /** Dónde se guardó, para poder auditarlo. */
  path: string | null;
};

/** Motivo por el que se puede rechazar una subida, ya traducido. */
export type UploadError =
  | "media-not-configured"
  | "bad-type"
  | "bad-size"
  | "no-file"
  | "upload-failed";

/** Datos del fichero, ya estén anidados o en la raíz de la respuesta. */
type FileDescriptor = {
  url?: string;
  thumbnailUrl?: string;
  id?: string;
  path?: string;
};

/** Respuesta de ImageKit, en sus dos formas conocidas. */
type ImageKitResponse = FileDescriptor & {
  success?: boolean;
  message?: string;
  fileId?: string;
  filePath?: string;
  file?: FileDescriptor;
};

export class UploadFailed extends Error {
  constructor(
    readonly reason: UploadError,
    /** Respuesta de ImageKit, solo para el log del servidor. */
    readonly detail?: string,
  ) {
    super(`imagekit-upload:${reason}`);
    this.name = "UploadFailed";
  }
}

/**
 * Sube una imagen a ImageKit.
 *
 * Lanza `UploadFailed` si algo falla; quien llama decide qué responder. Nunca
 * filtra la clave privada al log.
 */
export async function uploadImageToImageKit(
  file: File,
  folder: string,
): Promise<UploadResult> {
  const [privateKey, urlEndpoint] = await Promise.all([
    getEnvVar("IMAGEKIT_PRIVATE_KEY"),
    getEnvVar("IMAGEKIT_URL_ENDPOINT"),
  ]);

  if (!privateKey || !urlEndpoint) {
    throw new UploadFailed("media-not-configured");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadFailed("bad-type");
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new UploadFailed("bad-size");
  }

  // Carpeta segura: solo minúsculas, números y guiones, como mucho dos niveles.
  const safeFolder = sanitizeFolder(folder);
  const extension = EXTENSION_BY_TYPE[file.type] ?? "jpg";
  const fileName = `${crypto.randomUUID()}.${extension}`;

  const form = new FormData();
  form.append("file", new Blob([await file.arrayBuffer()], { type: file.type }), fileName);
  form.append("fileName", fileName);
  form.append("folder", safeFolder);
  form.append("useUniqueFileName", "true");
  // Sin esto ImageKit guarda el original tal cual; `true` la deja optimizada.
  form.append("useAsync", "false");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      // ImageKit espera Basic con la clave privada como usuario y vacío como
      // contraseña (`privada:`).
      Authorization: `Basic ${btoa(`${privateKey}:`)}`,
    },
    body: form,
  });

  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    // El cuerpo puede traer el motivo (límite de tamaño, quota, tipo…), pero
    // no lo pasamos al cliente: lo dejamos en el log del servidor.
    console.error("[imagekit] subida rechazada:", res.status, raw.slice(0, 400));
    throw new UploadFailed("upload-failed", `${res.status} ${raw.slice(0, 200)}`);
  }

  // ImageKit tiene dos formas de responder y conviven según el endpoint:
  //   antigua: { success: true, file: { id, url, path, thumbnailUrl } }
  //   actual:  { fileId, name, filePath, url, thumbnailUrl }  (plana)
  // Aceptamos las dos para no depender de cuál devuelva el día de hoy.
  let body: ImageKitResponse;
  try {
    body = JSON.parse(raw) as ImageKitResponse;
  } catch {
    console.error("[imagekit] respuesta ilegible:", raw.slice(0, 200));
    throw new UploadFailed("upload-failed", "respuesta ilegible");
  }

  // Los datos del fichero vienen anidados en la forma antigua y en la raíz en
  // la plana, así que los aplanamos en un único tipo.
  const anidado = body.file;
  const plano = body as FileDescriptor;
  const descriptor: FileDescriptor = {
    url: anidado?.url ?? plano.url,
    thumbnailUrl: anidado?.thumbnailUrl ?? plano.thumbnailUrl,
    id: anidado?.id ?? plano.id ?? body.fileId,
    path: anidado?.path ?? plano.path ?? body.filePath,
  };
  const url = descriptor.url;

  // `success` solo existe en la forma antigua; si viene a `false` es un fallo.
  if (body.success === false || !url) {
    console.error("[imagekit] subida sin url:", raw.slice(0, 300));
    throw new UploadFailed("upload-failed", body.message ?? "sin url");
  }

  // Guardamos la URL tal cual la devuelve ImageKit, pero comprobamos que
  // coincide con el endpoint configurado. Si el panel guardara una URL de otro
  // sitio por error, mejor enterarnos aquí que servir contenido raro después.
  if (!url.startsWith(stripTrailingSlash(urlEndpoint))) {
    console.error(
      `[imagekit] la url no coincide con IMAGEKIT_URL_ENDPOINT (${urlEndpoint}).`,
    );
  }

  return {
    url,
    thumbnailUrl: descriptor.thumbnailUrl ?? null,
    fileId: descriptor.id ?? null,
    path: descriptor.path ?? `${safeFolder}/${fileName}`,
  };
}

/** Tipos aceptados → extensión con la que se guarda. */
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/**
 * Deja la carpeta en `segmento/segmento`, en minúsculas y sin caracteres raros.
 * `""` si no queda nada válido, para que ImageKit use la raíz.
 */
function sanitizeFolder(folder: string): string {
  const clean = folder
    .split("/")
    .map((part) => part.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)
    .slice(0, 2)
    .join("/");
  return `prz/${clean || "misc"}`;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}