/**
 * POST /api/webauthn/register/verify — verifica y guarda el passkey.
 *
 * Body: `{ credential, deviceName? }` (respuesta de `startRegistration`).
 * Comprueba el challenge de la cookie y que sea del mismo usuario.
 */
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import {
  clearChallengeCookie,
  readChallenge,
  rpConfig,
  saveCredential,
} from "@/lib/auth/webauthn";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const saved = readChallenge(request);
  if (!saved || saved.type !== "register" || saved.userId !== session.user.id) {
    return NextResponse.json({ error: "bad-challenge" }, { status: 400 });
  }

  let body: { credential?: unknown; deviceName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body.credential || typeof body.credential !== "object") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { origin, rpID } = rpConfig(request);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.credential as Parameters<typeof verifyRegistrationResponse>[0]["response"],
      expectedChallenge: saved.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("[webauthn] register verify error:", err);
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { credential, credentialBackedUp } = verification.registrationInfo;
  // `isoBase64URL.fromBuffer` acepta Uint8Array (incluido el subtipo del lib).
  const publicKeyB64 = isoBase64URL.fromBuffer(
    new Uint8Array(credential.publicKey as unknown as Uint8Array),
  );
  try {
    await saveCredential({
      userId: session.user.id,
      credentialId: credential.id,
      publicKeyB64,
      counter: credential.counter,
      transports: credential.transports,
      deviceName:
        typeof body.deviceName === "string" && body.deviceName.trim()
          ? body.deviceName.trim()
          : credentialBackedUp
            ? "Sincronizado"
            : "Este dispositivo",
    });
  } catch (err) {
    // Credencial duplicada (ya registrada): no es error fatal.
    console.error("[webauthn] save credential error:", err);
    return NextResponse.json({ error: "duplicate" }, { status: 409 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", clearChallengeCookie(request));
  return res;
}
