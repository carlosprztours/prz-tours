import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { getEnvVar } from "@/lib/db/client";

/**
 * GET /api/admin/media — lista las fotos/vídeos ya subidos a ImageKit, para
 * elegirlos sin volver a subirlos. Solo staff. Nunca expone la clave privada.
 */
export async function GET(request: NextRequest) {
  try {
    await verifySession("en");
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const privado = await getEnvVar("IMAGEKIT_PRIVATE_KEY");
  if (!privado) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const folder = request.nextUrl.searchParams.get("folder") ?? "";
  const url = new URL("https://api.imagekit.io/v1/files");
  url.searchParams.set("limit", "100");
  if (folder) url.searchParams.set("path", folder);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${btoa(`${privado}:`)}` },
  });
  const body = await res.json().catch(() => [] as unknown);
  if (!res.ok || !Array.isArray(body)) {
    console.error("[media] ImageKit respondió", res.status);
    return NextResponse.json({ files: [] });
  }

  const files = (body as Record<string, unknown>[]).map((f) => ({
    fileId: f.fileId,
    name: f.name,
    url: f.url,
    thumbnailUrl: f.thumbnailUrl,
    type: f.type,
    filePath: f.filePath,
  }));
  return NextResponse.json({ files });
}
