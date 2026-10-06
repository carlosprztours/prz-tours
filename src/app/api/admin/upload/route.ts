/**
 * POST /api/admin/upload — sube una imagen a ImageKit.
 *
 * Solo staff. Acepta JPEG/PNG/WebP/AVIF/GIF de hasta 10 MB y devuelve la URL
 * pública de ImageKit, que se sirve por su CDN (formatos automáticos, WebP o
 * AVIF según el navegador).
 *
 * El nombre del fichero lo pone ImageKit con un UUID, así que dos imágenes con
 * el mismo nombre no se pisan. La clave privada se usa solo aquí, en el
 * servidor: nunca llega al navegador.
 */
import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { MAX_IMAGE_BYTES, UploadFailed, uploadImageToImageKit } from "@/lib/media/imagekit";

/** Respuestas con su código HTTP, para que el panel distinga el motivo. */
const STATUS: Record<string, number> = {
  "no-file": 400,
  "bad-type": 400,
  "bad-size": 400,
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
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no-file" }, { status: 400 });
  }

  const folder = String(form?.get("folder") ?? "misc");

  try {
    const result = await uploadImageToImageKit(file, folder);
    return NextResponse.json({
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      fileId: result.fileId,
    });
  } catch (err) {
    if (err instanceof UploadFailed) {
      return NextResponse.json(
        { error: err.reason },
        { status: STATUS[err.reason] ?? 502 },
      );
    }
    console.error("[upload] fallo inesperado:", err);
    return NextResponse.json({ error: "upload-failed" }, { status: 502 });
  }
}

/** GET devuelve el límite para que el panel pueda avisar antes de subir. */
export async function GET() {
  return NextResponse.json({ maxBytes: MAX_IMAGE_BYTES });
}