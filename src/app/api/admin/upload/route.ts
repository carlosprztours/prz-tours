/**
 * POST /api/admin/upload — sube una imagen al bucket R2 `MEDIA`.
 *
 * Solo staff. Acepta JPEG/PNG/WebP de hasta 5 MB y devuelve la URL pública
 * interna (`/api/media/…`). La clave incluye un UUID para evitar colisiones.
 */
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

import { verifySession } from "@/lib/auth/dal";
import { getMediaBucket } from "@/lib/db/client";

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  try {
    await verifySession("en");
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bucket = await getMediaBucket();
  if (!bucket) {
    return NextResponse.json({ error: "media-not-configured" }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no-file" }, { status: 400 });
  }

  const ext = EXTENSIONS[file.type];
  if (!ext) {
    return NextResponse.json({ error: "bad-type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES || file.size === 0) {
    return NextResponse.json({ error: "bad-size" }, { status: 400 });
  }

  const folder = String(form?.get("folder") ?? "misc").replace(/[^a-z0-9-]/g, "") || "misc";
  const key = `${folder}/${randomUUID()}.${ext}`;

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  }).catch((err) => {
    console.error("[upload] R2 put error:", err);
    throw err;
  });

  return NextResponse.json({ url: `/api/media/${key}` });
}
