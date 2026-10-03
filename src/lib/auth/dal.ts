/**
 * Data Access Layer (DAL) de autenticación.
 *
 * Dos niveles:
 *
 * - STAFF (`verifySession`): solo roles admin/editor. Para todas las páginas
 *   del panel y las Server Actions administrativas. Redirige al login si la
 *   sesión no es de staff. Un `customer` nunca pasa este filtro aunque tenga
 *   un JWT válido.
 * - CLIENTE (`verifyCustomerSession`): cualquier usuario activo. Para
 *   `/account` (mis reservas). Redirige al login si no hay sesión.
 *
 * Ambas usan `cache()` de React para no repetir la consulta a D1 dentro del
 * mismo render.
 */
import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { queryOne } from "@/lib/db/client";
import { defaultLocale } from "@/lib/i18n/config";
import type { Locale, User } from "@/types";
import {
  SESSION_COOKIE,
  sessionRowIsValid,
  verifyToken,
  type SessionPayload,
} from "./session";

export type VerifiedSession = {
  user: Pick<User, "id" | "email" | "name" | "role">;
  token: SessionPayload;
};

/** Lee el payload del JWT de la cookie (sin tocar la BD). */
async function readToken(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}

async function loadVerifiedSession(): Promise<VerifiedSession | null> {
  const token = await readToken();
  if (!token) return null;

  const valid = await sessionRowIsValid(token.sid);
  if (!valid) return null;

  const user = await queryOne<Pick<User, "id" | "email" | "name" | "role">>(
    `SELECT id, email, name, role FROM users
     WHERE id = ? AND is_active = 1`,
    token.uid,
  );
  if (!user) return null;

  // El rol real puede haber cambiado desde que se firmó el JWT.
  if (user.role !== token.role) {
    return { user, token: { ...token, role: user.role } };
  }
  return { user, token };
}

/** ¿Es personal con acceso al panel? */
function isStaff(role: string): boolean {
  return role === "admin" || role === "editor";
}

/**
 * Verificación de STAFF. Úsala al inicio de cada página del panel y de cada
 * Server Action administrativa. Redirige al login si no hay sesión de staff.
 *
 * Si había cookie con firma válida pero sin sesión en BD (revocada,
 * expirada o usuario eliminado/desactivado), se pasa por
 * `/api/auth/clear`, que borra la cookie y redirige al login. Las cookies
 * NO se pueden borrar durante el render (lanza error), por eso existe esa
 * ruta. Sin esto, el proxy vería la firma válida y devolvería a /admin o
 * /account en bucle infinito.
 */
export const verifySession = cache(
  async (locale: Locale = defaultLocale): Promise<VerifiedSession> => {
    const session = await loadVerifiedSession();
    if (!session) {
      redirect(await loginOrClear(locale));
    }
    // Con sesión válida de customer: redirige a su cuenta SIN borrar nada.
    if (!isStaff(session.user.role)) redirect(`/${locale}/account`);
    return session;
  },
);

/**
 * Verificación de CLIENTE (o staff: el staff también puede ver /account).
 * Redirige al login si no hay sesión.
 */
export const verifyCustomerSession = cache(
  async (locale: Locale = defaultLocale): Promise<VerifiedSession> => {
    const session = await loadVerifiedSession();
    if (!session) {
      redirect(await loginOrClear(locale));
    }
    return session;
  },
);

/**
 * Destino al fallar la verificación: al login directo si no había cookie,
 * o por `/api/auth/clear` (que la borra) si el JWT tenía firma válida.
 */
async function loginOrClear(locale: Locale): Promise<string> {
  const hasToken = await readToken();
  if (!hasToken) return `/${locale}/login`;
  return `/api/auth/clear?next=${encodeURIComponent(`/${locale}/login`)}`;
}

/** Devuelve la sesión verificada o `null` (sin redirigir). */
export const getCurrentUser = cache(
  async (): Promise<VerifiedSession | null> => {
    return loadVerifiedSession();
  },
);

/** Solo el payload del JWT (comprobación optimista, sin BD). */
export async function getTokenPayload(): Promise<SessionPayload | null> {
  return readToken();
}
