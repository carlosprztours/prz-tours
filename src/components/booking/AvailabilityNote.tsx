/**
 * Aviso de disponibilidad ("¡quedan X lugares!") bajo el selector de fecha
 * (componente de cliente).
 *
 * Consulta la acción `checkAvailability` cada vez que cambia la fecha.
 * Solo se muestra con tour y fecha concretos; en silencio si no hay datos.
 */
"use client";

import { useEffect, useState } from "react";

import { checkAvailability } from "@/lib/actions/availability";
import type { Availability } from "@/lib/db/availability";

type Props = {
  tourId: number | undefined;
  date: string;
  labels: {
    /** Usa {n} donde va el número, p. ej. "Quedan {n} lugares". */
    available: string;
    lastSpots: string;
    soldOut: string;
  };
};

export function AvailabilityNote({ tourId, date, labels }: Props) {
  const [state, setState] = useState<Availability | null>(null);

  useEffect(() => {
    if (!tourId || !date) {
      return;
    }
    let alive = true;
    checkAvailability(tourId, date)
      .then((a) => {
        if (alive) setState(a);
      })
      .catch(() => {
        if (alive) setState(null);
      });
    return () => {
      alive = false;
    };
  }, [tourId, date]);

  if (!state) return null;
  if (state.remaining <= 0) {
    return (
      <p className="mt-1 text-xs font-bold text-red-600" role="status">
        {labels.soldOut}
      </p>
    );
  }
  if (state.low) {
    return (
      <p className="mt-1 text-xs font-bold text-coral-600" role="status">
        {labels.lastSpots} · {labels.available.replace("{n}", String(state.remaining))}
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-ink-500" role="status">
      {labels.available.replace("{n}", String(state.remaining))}
    </p>
  );
}
