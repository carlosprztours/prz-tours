/**
 * POST /api/webauthn/login/verify — verifica el passkey y crea la sesión.
 *
 * Body: `{ email, credential }` (respuesta de `startAuthentication`).
 * Actualiza el `counter` (anti-replay) y crea la sesión local igual que
 * el login con contraseña. Devuelve `{ ok, redirect }`.
 */
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { NextResponse, type NextRequest } from "next/server";

import { logActivity } from "@/lib/admin/activity";
import { createSession } from "@/lib/auth/session";
import {
  clearChallengeCookie,
  credentialToLibFormat,
  getCredential,
  readChallenge,
  rpConfig,
  updateCredentialCounter,
} from "@/lib/auth/webauthn";
import { queryOne } from "@/lib/db/client";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import type { Locale, UserWithSecret } from "@/types";

export async function POST(request: NextRequest) {
  const saved = readChallenge(request);
  if (!saved || saved.type !== "login") {
    return NextResponse.json({ error: "bad-challenge" }, { status: 400 });
  }

  let body: { email?: string; credential?: unknown; locale?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email.includes("@") || !body.credential || typeof body.credential !== "object") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const locale: Locale = isLocale(body.locale ?? "") ? (body.locale as Locale) : defaultLocale;

  const user = await queryOne<UserWithSecret>(
    `SELECT id, email, name, role, phone, locale, is_active, password_hash, created_at, updated_at
     FROM users WHERE email = ? AND id = ?`,
    email,
    saved.userId,
  ).catch(() => null);
  if (!user || user.is_active !== 1) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const response = body.credential as Parameters<
    typeof verifyAuthenticationResponse
  >[0]["response"];
  const stored = await getCredential(response.id).catch(() => null);
  if (!stored || stored.user_id !== user.id) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const { origin, rpID } = rpConfig(request);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: saved.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: credentialToLibFormat(stored),
      requireUserVerification: true,
    });
  } catch (err) {
    console.error("[webauthn] login verify error:", err);
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  if (!verification.verified) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  await updateCredentialCounter(
    verification.authenticationInfo.credentialID,
    verification.authenticationInfo.newCounter,
  ).catch((err) => console.error("[webauthn] counter error:", err));

  await createSession(user.id, user.role);
  logActivity("login-passkey", user.email, user.id, user.email).catch(() => {});

  const redirect =
    user.role === "customer" ? `/${locale}/account` : `/${locale}/admin`;
  const res = NextResponse.json({ ok: true, redirect });
  res.headers.append("Set-Cookie", clearChallengeCookie(request));
  return res;
}
