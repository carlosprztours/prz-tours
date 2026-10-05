/**
 * Login con Google (OAuth 2.0, flujo "authorization code").
 *
 * Sin dependencias: todo con `fetch` (compatible con Workers).
 *
 * - Inicio: `GET /api/auth/google?locale=es&next=/es/account` guarda un
 *   `state` anti-CSRF en cookie y redirige a Google.
 * - Vuelta: `GET /api/auth/google/callback?code=…&state=…` verifica el
 *   state, cambia el código por un token, lee el perfil y busca o crea al
 *   usuario (siempre `customer` para cuentas nuevas; el rol del staff
 *   existente se respeta). Luego crea la sesión local (JWT + cookie).
 *
 * Las cuentas Google no tienen contraseña: se guarda un hash imposible
 * (`google-oauth$…`) que `verifyPassword` siempre rechaza, así el login
 * con contraseña nunca entra por ahí.
 *
 * Configuración (secretos/entorno):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * Y en Google Cloud Console → Credenciales → URIs de redirección:
 *   http://localhost:3000/api/auth/google/callback (local)
 *   https://TU-DOMINIO/api/auth/google/callback (producción)
 */
import "server-only";

import { getEnvVar } from "@/lib/db/client";

export type GoogleProfile = {
  sub: string;
  email: string;
  verified: boolean;
  name: string;
};

export async function getGoogleClient(): Promise<{
  id: string;
  secret: string;
} | null> {
  const [id, secret] = await Promise.all([
    getEnvVar("GOOGLE_CLIENT_ID"),
    getEnvVar("GOOGLE_CLIENT_SECRET"),
  ]);
  if (!id || !secret) return null;
  return { id, secret };
}

/**
 * Origen público de la petición (para `redirect_uri` de Google).
 * Usa el `Host` que ve el navegador, no el host de escucha del servidor.
 */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || url.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    url.protocol.replace(":", "") ||
    "https";
  return `${proto}://${host}`;
}

export function googleAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Cambia el `code` por un `access_token`. Devuelve `null` si falla. */
export async function exchangeGoogleCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!res.ok) {
      console.error("[google] token exchange status:", res.status);
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (err) {
    console.error("[google] token exchange error:", err);
    return null;
  }
}

/** Lee el perfil (sub, email, nombre). Solo acepta emails verificados. */
export async function fetchGoogleProfile(
  accessToken: string,
): Promise<GoogleProfile | null> {
  try {
    const res = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      console.error("[google] userinfo status:", res.status);
      return null;
    }
    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!data.sub || !data.email || data.email_verified !== true) return null;
    return {
      sub: data.sub,
      email: data.email.toLowerCase(),
      verified: true,
      name: (data.name ?? data.email.split("@")[0]).slice(0, 120),
    };
  } catch (err) {
    console.error("[google] userinfo error:", err);
    return null;
  }
}
