/**
 * Constantes y funciones puras de roles (sin `server-only`).
 *
 * Este módulo puede importarse tanto desde Server Components como desde
 * Client Components (p. ej. `UserRowActions` para saber si un usuario es
 * super-admin). La lógica de acceso con BD vive en `access.ts`.
 */

/** Cuentas que nadie puede degradar, desactivar ni eliminar. */
export const SUPER_ADMIN_EMAILS = ["dev@suprime.xyz"];

export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
