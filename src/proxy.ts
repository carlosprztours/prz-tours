/**
 * Proxy (antes "middleware" en Next ≤15).
 *
 * Dos responsabilidades, sin tocar la base de datos (rápido):
 *
 * 1. Idioma: si la ruta no lleva prefijo (/es, /en), redirige al idioma
 *    detectado por Accept-Language, con inglés como fallback (el público
 *    principal son turistas internacionales).
 * 2. Auth optimista: las rutas /:locale/admin/* requieren un JWT válido
 *    (solo se verifica la firma; la comprobación segura contra la BD la hace
 *    el DAL en cada página). /:locale/login redirige al panel si ya hay sesión.
 *
 * NOTA: aquí NO usamos getCloudflareContext (su versión asíncrona no está
 * garantizada dentro del proxy), sino `process.env.AUTH_SECRET`, que
 * OpenNext expone también en el runtime de Workers. Si el secreto falta,
 * fallamos en cerrado: todo /admin redirige al login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { defaultLocale, locales } from "@/lib/i18n/config";

const ADMIN_PREFIX = "/admin";
const ACCOUNT_PREFIX = "/account";
const LOGIN_PATH = "/login";
const SIGNUP_PATH = "/signup";

function getLocaleFromHeader(request: NextRequest): "es" | "en" {
  const header = request.headers.get("accept-language") ?? "";
  // Primer idioma con más peso: "es-DO,es;q=0.9,en;q=0.8" -> "es-DO"
  const first = header.split(",")[0]?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("es")) return "es";
  if (first.startsWith("en")) return "en";
  return defaultLocale;
}

function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
}

/**
 * Secreto de firma dentro del proxy.
 *
 * Orden: 1) contexto sync de OpenNext (funciona en el proxy tanto en dev
 * como en Workers), 2) `process.env` (por si el shim local no lo inyecta).
 * Si no hay secreto válido, se devuelve null y el proxy falla en cerrado.
 */
function getAuthSecret(): string | null {
  try {
    const { env } = getCloudflareContext();
    if (env.AUTH_SECRET && env.AUTH_SECRET.length >= 32) return env.AUTH_SECRET;
  } catch {
    // Sin contexto (p. ej. build/prerender): se intenta process.env.
  }
  const fallback = process.env.AUTH_SECRET;
  return fallback && fallback.length >= 32 ? fallback : null;
}

/** Verificación mínima del JWT: firma + expiración + forma del payload. */
async function readTokenPayload(
  token: string | undefined,
): Promise<{ uid: number; role: string; sid: string } | null> {
  if (!token) return null;
  const secret = getAuthSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] },
    );
    if (
      typeof payload.uid !== "number" ||
      (payload.role !== "admin" &&
        payload.role !== "editor" &&
        payload.role !== "photographer" &&
        payload.role !== "customer") ||
      typeof payload.sid !== "string"
    ) {
      return null;
    }
    return {
      uid: payload.uid,
      role: payload.role as string,
      sid: payload.sid,
    };
  } catch {
    return null;
  }
}

/** Host que usamos como canónico. Los alias redirigen aquí. */
const CANONICAL_HOST = "www.perez-tours.com";

/** Alias que deben redirigir al host canónico (301). */
const HOST_REDIRECTS: Record<string, string> = {
  "perez-tours.com": CANONICAL_HOST,
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Host canónico: si la petición llega por un alias (p. ej. www), se
  //    redirige a la raíz conservando ruta y query. Se hace aquí y no con
  //    reglas de Cloudflare porque su API de Page Rules no acepta los tokens
  //    de cuenta; así la lógica viaja con el código.
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const canonical = HOST_REDIRECTS[host];
  if (canonical) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = canonical;
    return NextResponse.redirect(url, 301);
  }

  // 1) Normalizar idioma
  if (!hasLocalePrefix(pathname)) {
    const locale = getLocaleFromHeader(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2) Auth optimista
  const locale = pathname.split("/")[1];
  const rest = pathname.slice(locale.length + 1) || "/";
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Propaga el idioma al layout raíz vía cabecera (para <html lang>).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  const isAdmin = rest === ADMIN_PREFIX || rest.startsWith(`${ADMIN_PREFIX}/`);
  const isAccount = rest === ACCOUNT_PREFIX || rest.startsWith(`${ACCOUNT_PREFIX}/`);
  const isLogin = rest === LOGIN_PATH || rest.startsWith(`${LOGIN_PATH}/`);
  const isSignup = rest === SIGNUP_PATH || rest.startsWith(`${SIGNUP_PATH}/`);

  const session = await readTokenPayload(token);

  // Panel: requiere staff. Un cliente con sesión válida va a su cuenta.
  if (isAdmin) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${LOGIN_PATH}`;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role === "customer") {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${ACCOUNT_PREFIX}`;
      return NextResponse.redirect(url);
    }
  }

  // Mi cuenta: requiere cualquier sesión válida.
  if (isAccount && !session) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${LOGIN_PATH}`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Login/registro con sesión: al panel si es staff, a su cuenta si es cliente.
  if ((isLogin || isSignup) && session) {
    const url = request.nextUrl.clone();
    url.pathname =
      session.role === "customer"
        ? `/${locale}${ACCOUNT_PREFIX}`
        : `/${locale}${ADMIN_PREFIX}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Todo menos estáticos de Next, API, favicon, manifiesto PWA e
    // imágenes/archivos con extensión.
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|css|js|txt|xml|webmanifest)$).*)",
  ],
};
