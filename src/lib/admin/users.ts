/**
 * Server Actions de gestión de usuarios (solo rol `admin`).
 *
 * - Crear staff (editor/admin). Nunca customer: esos se auto-registran.
 * - Cambiar rol, activar/desactivar, resetear contraseña, eliminar.
 * - Nadie puede degradarse ni eliminarse a sí mismo (anti-bloqueo).
 */
"use server";

import { revalidatePath } from "next/cache";

import { requireStaffRoles } from "./access";
import { isSuperAdminEmail } from "./roles";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { execute, query } from "@/lib/db/client";
import type { User, UserRole } from "@/types";

export type UsersResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(rawLocale: string) {
  const { locale, session } = await requireStaffRoles(rawLocale, "admin");
  return { locale, me: session.user.id, meEmail: session.user.email };
}

export async function listStaff(rawLocale: string): Promise<User[]> {
  await requireAdmin(rawLocale);
  return query<User>(
    `SELECT id, email, name, role, phone, locale, is_active, created_at, updated_at
     FROM users WHERE role IN ('admin','editor','photographer')
     ORDER BY role ASC, name ASC`,
  );
}

export async function listCustomers(
  rawLocale: string,
  limit = 100,
): Promise<User[]> {
  await requireAdmin(rawLocale);
  return query<User>(
    `SELECT id, email, name, role, phone, locale, is_active, created_at, updated_at
     FROM users WHERE role = 'customer'
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    limit,
  );
}

export async function createStaffUser(
  rawLocale: string,
  _prevState: UsersResult | undefined,
  formData: FormData,
): Promise<UsersResult> {
  const { locale, me } = await requireAdmin(rawLocale);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "editor");

  if (name.length < 2) return { ok: false, error: "bad-name" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "bad-email" };
  if (password.length < 8) return { ok: false, error: "weak-password" };
  if (role !== "admin" && role !== "editor" && role !== "photographer") {
    return { ok: false, error: "bad-role" };
  }
  if (isSuperAdminEmail(email)) return { ok: false, error: "protected" };

  try {
    await execute(
      `INSERT INTO users (email, name, password_hash, role, locale)
       VALUES (?, ?, ?, ?, ?)`,
      email,
      name,
      await hashPassword(password),
      role,
      locale,
    );
  } catch (err) {
    // Solo el conflicto UNIQUE es "email duplicado"; lo demás es fallo real.
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(msg)) {
      return { ok: false, error: "email-taken" };
    }
    console.error("[admin/users] create staff error:", err);
    return { ok: false, error: "db-error" };
  }

  revalidatePath(`/${locale}/admin/users`);
  const { logActivity } = await import("./activity");
  await logActivity("user.create", `${email} (${role})`, me, "admin");
  return { ok: true };
}

export async function setStaffRole(
  rawLocale: string,
  userId: number,
  role: UserRole,
): Promise<UsersResult> {
  const { locale, me, meEmail } = await requireAdmin(rawLocale);
  if (userId === me) return { ok: false, error: "self" };
  if (!["admin", "editor", "photographer", "customer"].includes(role)) {
    return { ok: false, error: "bad-role" };
  }
  const target = await query<{ email: string }>(
    `SELECT email FROM users WHERE id = ?`,
    userId,
  );
  if (target[0] && isSuperAdminEmail(target[0].email)) {
    return { ok: false, error: "protected" };
  }

  await execute(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, role, userId);
  revalidatePath(`/${locale}/admin/users`);
  const { logActivity } = await import("./activity");
  await logActivity("user.role", `#${userId} → ${role}`, me, meEmail);
  return { ok: true };
}

/** Promoción manual: convierte un customer en staff (editor/fotógrafo). */
export async function promoteCustomer(
  rawLocale: string,
  userId: number,
  role: Extract<UserRole, "admin" | "editor" | "photographer"> = "editor",
): Promise<UsersResult> {
  const { locale, me, meEmail } = await requireAdmin(rawLocale);
  const target = await query<{ email: string }>(
    `SELECT email FROM users WHERE id = ?`,
    userId,
  );
  if (target[0] && isSuperAdminEmail(target[0].email)) {
    return { ok: false, error: "protected" };
  }
  await execute(
    `UPDATE users SET role = ?, updated_at = datetime('now')
     WHERE id = ? AND role = 'customer'`,
    role,
    userId,
  );
  revalidatePath(`/${locale}/admin/users`);
  const { logActivity } = await import("./activity");
  await logActivity("user.promote", `#${userId} → ${role}`, me, meEmail);
  return { ok: true };
}

export async function setUserActive(
  rawLocale: string,
  userId: number,
  active: boolean,
): Promise<UsersResult> {
  const { locale, me, meEmail } = await requireAdmin(rawLocale);
  if (userId === me) return { ok: false, error: "self" };
  const target = await query<{ email: string }>(
    `SELECT email FROM users WHERE id = ?`,
    userId,
  );
  if (target[0] && isSuperAdminEmail(target[0].email)) {
    return { ok: false, error: "protected" };
  }

  await execute(
    `UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    active ? 1 : 0,
    userId,
  );
  if (!active) await revokeAllUserSessions(userId);
  revalidatePath(`/${locale}/admin/users`);
  const { logActivity } = await import("./activity");
  await logActivity(active ? "user.activate" : "user.deactivate", `#${userId}`, me, meEmail);
  return { ok: true };
}

export async function resetUserPassword(
  rawLocale: string,
  userId: number,
  formData: FormData,
): Promise<UsersResult> {
  const { locale, me } = await requireAdmin(rawLocale);
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "weak-password" };

  await execute(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    await hashPassword(password),
    userId,
  );
  await revokeAllUserSessions(userId);
  revalidatePath(`/${locale}/admin/users`);
  const { logActivity } = await import("./activity");
  await logActivity("user.password-reset", `#${userId}`, me, "admin");
  return { ok: true };
}

export async function deleteUser(
  rawLocale: string,
  userId: number,
): Promise<UsersResult> {
  const { locale, me, meEmail } = await requireAdmin(rawLocale);
  if (userId === me) return { ok: false, error: "self" };
  const target = await query<{ email: string }>(
    `SELECT email FROM users WHERE id = ?`,
    userId,
  );
  if (target[0] && isSuperAdminEmail(target[0].email)) {
    return { ok: false, error: "protected" };
  }

  await revokeAllUserSessions(userId);
  await execute(`DELETE FROM users WHERE id = ?`, userId);
  revalidatePath(`/${locale}/admin/users`);
  const { logActivity } = await import("./activity");
  await logActivity("user.delete", `#${userId}`, me, meEmail);
  return { ok: true };
}
