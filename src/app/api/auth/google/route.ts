/**
 * GET /api/auth/google — inicia el login con Google.
 *
 * Parámetros: `?locale=es&next=/es/account` (ambos opcionales).
 * Guarda un `state` anti-CSRF en cookie httpOnly y redirige a Google.
 * Si Google no está configurado, vuelve al login.
 */
import { NextResponse, type NextRequest } from "next/server";

import { getGoogleClient } from "@/lib/auth/google";
import { googleAuthUrl, publicOrigin } from "@/lib/auth/google";
import { isLocale, defaultLocale } from "@/lib/i18n/config";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const rawLocale = url.searchParams.get("locale") ?? "";
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const rawNext = url.searchParams.get("next") ?? "";
  const next =
    rawNext.startsWith(`/${locale}/`) && !rawNext.includes("..")
      ? rawNext
      : undefined;
  const rawRef = (url.searchParams.get("ref") ?? "").trim().toUpperCase();
  const inviteRef = /^[A-Z0-9]{1,8}$/.test(rawRef) ? rawRef : undefined;

  const client = await getGoogleClient();
  if (!client) {
    return NextResponse.redirect(new URL(`/${locale}/login`, publicOrigin(request)));
  }

  const redirectUri = `${publicOrigin(request)}/api/auth/google/callback`;
  const state = crypto.randomUUID();

  const loginUrl = new URL(`/${locale}/login`, publicOrigin(request));
  if (next) loginUrl.searchParams.set("next", next);
  const res = NextResponse.redirect(
    googleAuthUrl(client.id, redirectUri, state),
  );
  res.cookies.set("prz_oauth_state", JSON.stringify({ state, locale, next, inviteRef }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return res;
}
