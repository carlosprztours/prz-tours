/**
 * Límite de error de cada idioma: si una página falla (p. ej. D1 caído),
 * muestra una UI propia con reintento en vez del 500 genérico.
 */
"use client";

import { useEffect } from "react";

export default function LangError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lang-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl font-extrabold text-ocean-600">500</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">
          Algo salió mal · Something went wrong
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Inténtalo de nuevo en unos minutos. · Please try again in a few minutes.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-ocean-600 px-6 text-sm font-bold text-white transition hover:bg-ocean-700"
        >
          Reintentar · Try again
        </button>
      </div>
    </div>
  );
}
