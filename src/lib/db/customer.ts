/**
 * Datos del cliente logueado para pre-rellenar formularios de reserva.
 *
 * Devuelve `undefined` si no hay sesión (el formulario queda vacío).
 * Nunca redirige: las páginas públicas deben funcionar con y sin cuenta.
 */
import "server-only";

import { getCurrentUser } from "@/lib/auth/dal";
import { queryOne } from "@/lib/db/client";

export type BookingDefaults = {
  name: string;
  email: string;
  phone: string;
};

export async function getBookingDefaults(): Promise<BookingDefaults | undefined> {
  const session = await getCurrentUser().catch(() => null);
  if (!session) return undefined;

  const row = await queryOne<{ name: string; phone: string | null }>(
    `SELECT name, phone FROM users WHERE id = ?`,
    session.user.id,
  );

  return {
    name: row?.name ?? session.user.name,
    email: session.user.email,
    phone: row?.phone ?? "",
  };
}
