/**
 * Server Action pública: disponibilidad de un tour en una fecha.
 *
 * Solo lectura, sin auth. Devuelve el cupo restante o null si la fecha
 * no es válida.
 */
"use server";

import { getAvailability, type Availability } from "@/lib/db/availability";

export async function checkAvailability(
  tourId: number,
  date: string,
): Promise<Availability | null> {
  return getAvailability(tourId, date);
}
