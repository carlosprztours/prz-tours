/**
 * POST /api/webauthn/register/options — opciones para registrar un passkey.
 *
 * Requiere sesión. Devuelve las opciones (`challenge` incluido) y guarda
 * el challenge en cookie httpOnly para verificarlo después.
 */
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import {
  challengeCookieHeader,
  listUserCredentials,
  rpConfig,
} from "@/lib/auth/webauthn";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { rpID, rpName } = rpConfig(request);
  const existing = await listUserCredentials(session.user.id).catch(() => []);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: session.user.email,
    userID: new TextEncoder().encode(String(session.user.id)),
    userDisplayName: session.user.name,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.credential_id })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const res = NextResponse.json(options);
  res.headers.append(
    "Set-Cookie",
    challengeCookieHeader(request, {
      challenge: options.challenge,
      type: "register",
      userId: session.user.id,
    }),
  );
  return res;
}
