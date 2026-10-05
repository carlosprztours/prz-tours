/**
 * POST /api/webauthn/login/options — opciones para entrar con passkey.
 *
 * Body: `{ email }`. Busca al usuario y sus credenciales; si no tiene
 * ninguna, responde `no-credentials` para que la UI ofrezca otro método.
 */
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";

import {
  challengeCookieHeader,
  listUserCredentials,
  rpConfig,
} from "@/lib/auth/webauthn";
import { queryOne } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  // Respuesta genérica para no revelar si el email existe.
  const user = await queryOne<{ id: number; is_active: number }>(
    `SELECT id, is_active FROM users WHERE email = ?`,
    email,
  ).catch(() => null);
  const creds = user ? await listUserCredentials(user.id).catch(() => []) : [];
  if (!user || user.is_active !== 1 || creds.length === 0) {
    return NextResponse.json({ error: "no-credentials" }, { status: 404 });
  }

  const { rpID } = rpConfig(request);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      transports: c.transports ? (JSON.parse(c.transports) as string[]) : undefined,
    })),
    userVerification: "required",
  });

  const res = NextResponse.json(options);
  res.headers.append(
    "Set-Cookie",
    challengeCookieHeader(request, {
      challenge: options.challenge,
      type: "login",
      userId: user.id,
    }),
  );
  return res;
}
