/**
 * Acceso por roles del panel (una sola fuente de verdad).
 *
 * Roles:
 * - `admin`: todo (único que toca usuarios, ajustes y actividad).
 * - `editor`: opera y edita contenido no sensible (reservas, tours,
 *   traslados, opiniones, promos, cupones, blog, FAQ, galería, mensajes,
 *   ocupación). NADA de usuarios/ajustes/actividad.
 * - `photographer`: SOLO galería (ver, subir y borrar fotos).
 * - `customer`: sin panel.
 *
 * Se aplica en dos capas (ver `docs/RUTAS.md`):
 * 1. Páginas (`requireSection`): redirige/404 según el rol real en BD.
 * 2. Server Actions (`requireStaffRoles`): lanza `forbidden` si el rol no
 *    alcanza. Nunca confíes solo en ocultar el menú.
 *
 * Super-admin (`dev@suprime.xyz`): intocable desde el panel (sin degradar,
 * desactivar ni eliminar, ni siquiera por sí mismo).
 */
import "server-only";

import { notFound } from "next/navigation";

import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { isSuperAdminEmail } from "./roles";
import { isLocale } from "@/lib/i18n";
import type { Locale, UserRole } from "@/types";

export { isSuperAdminEmail };

/** Secciones del panel y quién entra a cada una. */
export const SECTION_ROLES: Record<string, UserRole[]> = {
  dashboard: ["admin", "editor"],
  bookings: ["admin", "editor"],
  occupancy: ["admin", "editor"],
  tours: ["admin", "editor"],
  transfers: ["admin", "editor"],
  testimonials: ["admin", "editor"],
  promos: ["admin", "editor"],
  coupons: ["admin", "editor"],
  blog: ["admin", "editor"],
  faq: ["admin", "editor"],
  gallery: ["admin", "editor", "photographer"],
  messages: ["admin", "editor"],
  users: ["admin"],
  settings: ["admin"],
  activity: ["admin"],
};

/**
 * Guard para páginas del panel. Devuelve la sesión si el rol alcanza;
 * si no, 404 (igual que la página de usuarios hacía antes).
 */
export async function requireSection(locale: Locale, section: string) {
  const session = await getCurrentUser().catch(() => null);
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect(`/${locale}/login`);
    // redirect() nunca retorna, pero TypeScript no lo sabe:
    throw new Error("unreachable");
  }
  const allowed = SECTION_ROLES[section] ?? [];
  if (!allowed.includes(session.user.role)) notFound();
  return session;
}

/**
 * Guard para Server Actions del panel. Lanza `forbidden` si el rol no
 * alcanza (las acciones lo propagan como fallo).
 */
export async function requireStaffRoles(
  rawLocale: string,
  ...allowed: UserRole[]
): Promise<{ locale: Locale; session: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const session = await verifySession(locale);
  if (!allowed.includes(session.user.role)) throw new Error("forbidden");
  return { locale, session };
}

/** Solo contenido operativo (todo menos usuarios/ajustes/actividad). */
export async function requireEditor(rawLocale: string) {
  return requireStaffRoles(rawLocale, "admin", "editor");
}
