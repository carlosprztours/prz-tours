/**
 * GET /api/media/[...key] — sirve imágenes del bucket R2 `MEDIA`.
 *
 * Público con caché larga (las claves llevan UUID, así que son inmutables).
 * Si el bucket no existe o la clave no se encuentra, 404.
 */
import { NextResponse, type NextRequest } from "next/server";

import { getMediaBucket } from "@/lib/db/client";

type Props = {
  params: Promise<{ key: string[] }>;
};

export async function GET(_request: NextRequest, { params }: Props) {
  const { key } = await params;
  const objectKey = key.join("/");

  // Solo claves con formato esperado (carpeta/uuid.ext).
  if (!/^[a-z0-9-]+\/[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(objectKey)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bucket = await getMediaBucket();
  if (!bucket) return new NextResponse("Not found", { status: 404 });

  const object = await bucket.get(objectKey);
  if (!object) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
