/**
 * DELETE /api/webauthn/credentials — elimina un passkey del usuario.
 *
 * Body: `{ id }` (id numérico de la credencial). Solo el dueño puede
 * borrar las suyas.
 */
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { deleteUserCredential } from "@/lib/auth/webauthn";

export async function DELETE(request: NextRequest) {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { id?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!Number.isInteger(body.id) || (body.id as number) <= 0) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const deleted = await deleteUserCredential(body.id as number, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
