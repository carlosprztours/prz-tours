/**
 * GET /api/auth/clear?next=/es/login — borra la cookie de sesión y redirige.
 *
 * Existe porque las cookies NO se pueden borrar durante el render de un
 * Server Component (lanza error); en un Route Handler sí. El DAL redirige
 * aquí cuando encuentra un JWT con firma válida pero sin sesión en BD
 * (revocada, expirada o usuario eliminado), rompiendo el bucle
 * login ↔ account/admin que eso provocaría.
 */
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

/** Solo rutas internas del mismo idioma (anti open-redirect). */
function safeNext(raw: string | null): string {
  if (!raw) return `/${defaultLocale}/login`;
  const match = raw.match(/^\/(es|en)(\/.*)?$/);
  if (!match || !isLocale(match[1])) return `/${defaultLocale}/login`;
  return raw;
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL(next, request.url));
}
