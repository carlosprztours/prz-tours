/**
 * Sesiones: JWT firmado + fila en base de datos.
 *
 * Estrategia híbrida:
 *
 * - El JWT (cookie `prz_session`, HttpOnly) lleva el mínimo necesario:
 *   el id de usuario, su rol y el id de la sesión en BD.
 * - La tabla `sessions` permite revocar el acceso desde el panel
 *   (cerrar sesión en todos los dispositivos, desactivar un usuario).
 *
 * El proxy hace una comprobación optimista (solo verifica la firma del JWT,
 * sin tocar la BD). Las Server Actions y las páginas del panel usan
 * `verifySession()` del DAL, que sí comprueba la BD (verificación segura).
 */
import "server-only";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

import { execute, getEnvVar, queryOne } from "@/lib/db/client";
import type { Session, UserRole } from "@/types";

export const SESSION_COOKIE = "prz_session";
/** Duración de la sesión: 7 días. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionPayload = {
  /** Id del usuario. */
  uid: number;
  /** Rol (para mostrar/ocultar UI sin consultar la BD). */
  role: UserRole;
  /** Id de la fila en `sessions` (para poder revocarla). */
  sid: string;
};

function getSecretKey(): Promise<Uint8Array> {
  return getEnvVar("AUTH_SECRET").then((secret) => {
    if (!secret || secret.length < 32) {
      throw new Error(
        "AUTH_SECRET no configurado o demasiado corto (mínimo 32 caracteres). " +
          "Defínelo con `wrangler secret put AUTH_SECRET` o en .dev.vars para local.",
      );
    }
    return new TextEncoder().encode(secret);
  });
}

/** Firma un payload y devuelve el JWT. */
export async function signSession(payload: SessionPayload): Promise<string> {
  const key = await getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/** Verifica la firma del JWT. Devuelve el payload o `null`. */
export async function verifyToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const key = await getSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (
      typeof payload.uid !== "number" ||
      (payload.role !== "admin" &&
        payload.role !== "editor" &&
        payload.role !== "customer") ||
      typeof payload.sid !== "string"
    ) {
      return null;
    }
    return { uid: payload.uid, role: payload.role, sid: payload.sid };
  } catch {
    return null;
  }
}

/**
 * Crea una sesión: inserta la fila en BD, firma el JWT y pone la cookie.
 * Debe llamarse desde una Server Action o Route Handler.
 */
export async function createSession(
  userId: number,
  role: UserRole,
): Promise<void> {
  const sid = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const headerList = await headers();
  const userAgent = headerList.get("user-agent")?.slice(0, 255) ?? null;
  // En Workers la IP real llega en CF-Connecting-IP; en local no existe.
  const ip =
    headerList.get("cf-connecting-ip")?.slice(0, 64) ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ??
    null;

  await execute(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?)`,
    sid,
    userId,
    expiresAt,
    userAgent,
    ip,
  );

  const token = await signSession({ uid: userId, role, sid });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Borra la cookie y la fila de la sesión actual (logout). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token);
  if (payload) {
    await execute(`DELETE FROM sessions WHERE id = ?`, payload.sid);
  }
  store.delete(SESSION_COOKIE);
}

/** Revoca todas las sesiones de un usuario. */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  await execute(`DELETE FROM sessions WHERE user_id = ?`, userId);
}

/** Comprueba que la fila de sesión exista y no haya expirado. */
export async function sessionRowIsValid(sid: string): Promise<boolean> {
  const row = await queryOne<Pick<Session, "id">>(
    `SELECT id FROM sessions WHERE id = ? AND expires_at > datetime('now')`,
    sid,
  );
  return row !== null;
}

/**
 * Limpia las sesiones expiradas. Pensado para llamarse de forma periódica
 * (p. ej. desde un cron de Cloudflare o al hacer login).
 */
export async function pruneExpiredSessions(): Promise<number> {
  const result = await execute(
    `DELETE FROM sessions WHERE expires_at <= datetime('now')`,
  );
  return result.meta.changes ?? 0;
}
