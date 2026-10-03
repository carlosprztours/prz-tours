/**
 * Server Actions de autenticación.
 *
 * - `login`: verifica email + contraseña contra `users` (cualquier rol) y
 *   redirige según el rol: staff → panel, customer → su cuenta.
 * - `signup`: registro PÚBLICO. Crea siempre un usuario `customer` normal;
 *   inicia sesión y redirige a /account. Nunca crea staff.
 * - `logout`: destruye la sesión y redirige al login.
 *
 * La promoción a staff es manual: desde el panel (solo admins) o con
 * `npm run create-admin`. Así el registro público no abre ningún agujero.
 */
"use server";

import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  destroySession,
  pruneExpiredSessions,
} from "@/lib/auth/session";
import { execute, queryOne } from "@/lib/db/client";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import type { Locale, UserWithSecret } from "@/types";

export type AuthResult = { ok: true } | { ok: false; error: string };

function startUrl(role: string, locale: Locale, next?: string): string {
  const fallback = role === "customer" ? `/${locale}/account` : `/${locale}/admin`;
  if (!next) return fallback;
  // Solo rutas internas del mismo idioma (evita open-redirect).
  if (role === "customer" && next.startsWith(`/${locale}/account`)) return next;
  if (role !== "customer" && next.startsWith(`/${locale}/admin`)) return next;
  return fallback;
}

function formToObject(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  return raw;
}

export async function login(
  locale: Locale,
  _prevState: AuthResult | undefined,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const user = await queryOne<UserWithSecret>(
    `SELECT id, email, name, role, phone, locale, is_active, password_hash, created_at, updated_at
     FROM users WHERE email = ?`,
    parsed.data.email,
  );

  // Respuesta genérica para no revelar si el email existe.
  if (!user || user.is_active !== 1) return { ok: false, error: "invalid" };

  const passwordOk = await verifyPassword(
    parsed.data.password,
    user.password_hash,
  );
  if (!passwordOk) return { ok: false, error: "invalid" };

  // Limpieza oportunista de sesiones expiradas (barata y sin cron).
  pruneExpiredSessions().catch(() => {});

  await createSession(user.id, user.role);
  redirect(startUrl(user.role, locale, parsed.data.next));
}

export async function signup(
  locale: Locale,
  _prevState: AuthResult | undefined,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signupSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const code =
      first?.path[0] === "email"
        ? "invalid-email"
        : first?.path[0] === "password"
          ? "weak-password"
          : "invalid-name";
    return { ok: false, error: code };
  }

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM users WHERE email = ?`,
    parsed.data.email,
  );
  if (existing) return { ok: false, error: "email-taken" };

  const passwordHash = await hashPassword(parsed.data.password);
  const result = await execute(
    `INSERT INTO users (email, name, password_hash, role, locale)
     VALUES (?, ?, ?, 'customer', ?)`,
    parsed.data.email,
    parsed.data.name,
    passwordHash,
    locale,
  );

  const userId = Number(result.meta.last_row_id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, error: "invalid-name" };
  }
  await createSession(userId, "customer");
  redirect(`/${locale}/account`);
}

export async function logout(locale: Locale): Promise<never> {
  await destroySession();
  redirect(`/${locale}/login`);
}

/** Acción para verificar desde el cliente si sigue habiendo sesión. */
export async function checkSession(locale: Locale): Promise<boolean> {
  try {
    await verifySession(locale);
    return true;
  } catch {
    return false;
  }
}
