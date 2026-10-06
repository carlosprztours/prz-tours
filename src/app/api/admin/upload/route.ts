/**
 * POST /api/admin/upload — sube una o varias imágenes a ImageKit.
 *
 * Solo staff. Acepta JPEG/PNG/WebP/AVIF/GIF de hasta 10 MB por foto y devuelve
 * las URLs públicas de ImageKit, que se sirven por su CDN.
 *
 * Se pueden mandar varias en una sola llamada (`files`), que es lo que usa el
 * botón cuando se elige más de una foto. El nombre lo pone ImageKit con un
 * UUID, así que dos imágenes homónimas no se pisan. La clave privada se usa
 * solo aquí, en el servidor: nunca llega al navegador.
 *
 * Si alguna foto falla, las demás se suben igualmente y se informa de cuáles
 * han quedado fuera: es preferible subir 8 de 10 y avisar a perder las 10.
 */
import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import {
  MAX_FILES_PER_UPLOAD,
  MAX_IMAGE_BYTES,
  UploadFailed,
  uploadImagesToImageKit,
} from "@/lib/media/imagekit";

/** Respuestas con su código HTTP, para que el panel distinga el motivo. */
const STATUS: Record<string, number> = {
  "no-file": 400,
  "bad-type": 400,
  "bad-size": 400,
  "too-many": 400,
  "media-not-configured": 503,
  "upload-failed": 502,
};

export async function POST(request: NextRequest) {
  try {
    await verifySession("en");
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  // `files` para varias, `file` para una sola (se acepta por compatibilidad).
  const archivos: File[] = form
    ? form.getAll("files").filter((f): f is File => f instanceof File)
    : [];
  const uno = form?.get("file");
  if (uno instanceof File) archivos.push(uno);

  if (archivos.length === 0) {
    return NextResponse.json({ error: "no-file" }, { status: 400 });
  }
  if (archivos.length > MAX_FILES_PER_UPLOAD) {
    return NextResponse.json(
      { error: "too-many", max: MAX_FILES_PER_UPLOAD },
      { status: 400 },
    );
  }

  const folder = String(form?.get("folder") ?? "misc");

  try {
    const { subidas, fallidas } = await uploadImagesToImageKit(archivos, folder);

    if (subidas.length === 0) {
      // Ninguna salió: se devuelve el motivo de la primera para que se vea.
      return NextResponse.json(
        { error: fallidas[0]?.motivo ?? "upload-failed" },
        { status: STATUS[fallidas[0]?.motivo ?? "upload-failed"] ?? 502 },
      );
    }

    return NextResponse.json({
      images: subidas.map((s) => ({
        url: s.url,
        thumbnailUrl: s.thumbnailUrl,
        fileId: s.fileId,
      })),
      // Con una sola foto se manda también `url` para no romper a quien aún
      // espere la respuesta antigua.
      url: subidas.length === 1 ? subidas[0].url : undefined,
      failed: fallidas,
      maxBytes: MAX_IMAGE_BYTES,
      maxFiles: MAX_FILES_PER_UPLOAD,
    });
  } catch (err) {
    if (err instanceof UploadFailed) {
      return NextResponse.json({ error: err.reason }, { status: STATUS[err.reason] ?? 502 });
    }
    console.error("[upload] fallo inesperado:", err);
    return NextResponse.json({ error: "upload-failed" }, { status: 502 });
  }
}

/** GET devuelve los límites para que el panel pueda avisar antes de subir. */
export async function GET() {
  return NextResponse.json({ maxBytes: MAX_IMAGE_BYTES, maxFiles: MAX_FILES_PER_UPLOAD });
}