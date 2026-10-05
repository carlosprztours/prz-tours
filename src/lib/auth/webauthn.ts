/**
 * Passkeys (WebAuthn): huella, Face ID o PIN del dispositivo.
 *
 * Ceremonias con `@simplewebauthn/server` (WebCrypto, compatible Workers):
 * - Registro (logueado): `POST /api/webauthn/register/options` →
 *   navegador (`startRegistration`) → `POST /api/webauthn/register/verify`.
 * - Entrada (sin sesión): `POST /api/webauthn/login/options {email}` →
 *   navegador (`startAuthentication`) → `POST /api/webauthn/login/verify`
 *   (crea la sesión local igual que el login con contraseña).
 *
 * El `challenge` viaja en cookie httpOnly de 5 minutos (no hace falta
 * tabla extra). RP ID = host actual (localhost en dev, dominio en prod).
 */
import "server-only";

import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { NextRequest } from "next/server";

import { execute, query, queryOne } from "@/lib/db/client";

export const WEBAUTHN_CHALLENGE_COOKIE = "prz_webauthn";

export type StoredCredential = {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  device_name: string;
  created_at: string;
};

export type ChallengeData = {
  challenge: string;
  type: "register" | "login";
  /** 0 = ceremonia descubrible (usuario aún sin identificar). */
  userId: number;
};

/** RP ID y origen desde la petición (localhost o dominio final). */
export function rpConfig(request: NextRequest): {
  rpID: string;
  origin: string;
  rpName: string;
} {
  // OJO: `request.url` puede traer el host de escucha (0.0.0.0) en dev;
  // el navegador ve el `Host`, que es lo que manda para WebAuthn.
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || url.host;
  const hostname = host.split(":")[0] || url.hostname;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    url.protocol.replace(":", "") ||
    "https";
  return { rpID: hostname, origin: `${proto}://${host}`, rpName: "Perez Tours" };
}

export function readChallenge(request: NextRequest): ChallengeData | null {
  try {
    const raw = request.cookies.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
    if (!raw) return null;
    const data = JSON.parse(raw) as ChallengeData;
    if (
      !data.challenge ||
      typeof data.userId !== "number" ||
      (data.type !== "register" && data.type !== "login")
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function challengeCookieHeader(
  request: NextRequest,
  data: ChallengeData,
): string {
  const secure = new URL(request.url).protocol === "https:";
  return `${WEBAUTHN_CHALLENGE_COOKIE}=${encodeURIComponent(JSON.stringify(data))}; Path=/api/webauthn; HttpOnly; SameSite=Lax; Max-Age=300${secure ? "; Secure" : ""}`;
}

export function clearChallengeCookie(request: NextRequest): string {
  const secure = new URL(request.url).protocol === "https:";
  return `${WEBAUTHN_CHALLENGE_COOKIE}=; Path=/api/webauthn; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function listUserCredentials(
  userId: number,
): Promise<StoredCredential[]> {
  return query<StoredCredential>(
    `SELECT id, user_id, credential_id, public_key, counter, transports, device_name, created_at
     FROM webauthn_credentials WHERE user_id = ? ORDER BY id ASC`,
    userId,
  );
}

export async function getCredential(
  credentialId: string,
): Promise<StoredCredential | null> {
  return queryOne<StoredCredential>(
    `SELECT id, user_id, credential_id, public_key, counter, transports, device_name, created_at
     FROM webauthn_credentials WHERE credential_id = ?`,
    credentialId,
  );
}

export async function saveCredential(input: {
  userId: number;
  credentialId: string;
  publicKeyB64: string;
  counter: number;
  transports?: string[];
  deviceName?: string;
}): Promise<void> {
  await execute(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports, device_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.userId,
    input.credentialId,
    input.publicKeyB64,
    input.counter,
    input.transports ? JSON.stringify(input.transports) : null,
    (input.deviceName ?? "").slice(0, 80),
  );
}

export async function updateCredentialCounter(
  credentialId: string,
  counter: number,
): Promise<void> {
  await execute(
    `UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?`,
    counter,
    credentialId,
  );
}

export async function deleteUserCredential(
  id: number,
  userId: number,
): Promise<boolean> {
  const result = await execute(
    `DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?`,
    id,
    userId,
  );
  return (result.meta.changes ?? 0) > 0;
}

export function credentialToLibFormat(row: StoredCredential): {
  id: string;
  publicKey: Uint8Array<ArrayBuffer>;
  counter: number;
  transports?: string[];
} {
  const raw = isoBase64URL.toBuffer(row.public_key);
  const publicKey = new Uint8Array(raw.length);
  publicKey.set(raw);
  return {
    id: row.credential_id,
    publicKey,
    counter: row.counter,
    transports: row.transports ? (JSON.parse(row.transports) as string[]) : undefined,
  };
}
