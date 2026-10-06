/**
 * Rejilla de fotos de la galería con visor a pantalla casi completa.
 *
 * Al pulsar una foto se abre grande; el visor permite moverse entre fotos con
 * las flechas, Esc para cerrar y botones de anterior/siguiente. Es un cliente
 * porque necesita estado (la foto activa y si el visor está abierto).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import { SafeImage } from "@/components/SafeImage";
import type { GalleryImage } from "@/types";

type Props = {
  images: GalleryImage[];
  siteName: string;
  emptyLabel?: string;
};

export function GalleryGrid({ images, siteName }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);

  const cerrar = useCallback(() => setAbierto(false), []);
  const anterior = useCallback(
    () => setIndice((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const siguiente = useCallback(
    () => setIndice((i) => (i + 1) % images.length),
    [images.length],
  );

  // Navegación por teclado con el visor abierto.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") siguiente();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, cerrar, anterior, siguiente]);

  const actual = images[indice];

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              setIndice(i);
              setAbierto(true);
            }}
            className="group relative aspect-square overflow-hidden rounded-2xl bg-sand-100 text-left"
            aria-label={img.alt || img.caption || "Ver foto"}
          >
            <SafeImage
              src={img.url}
              alt={img.alt || img.caption || siteName}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {img.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950/80 to-transparent p-3 pt-8 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {abierto && actual && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-ocean-950/95 p-4 sm:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <div className="flex items-center justify-between text-white">
            <p className="text-sm font-semibold text-white/80">
              {indice + 1} / {images.length}
            </p>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-bold hover:bg-white/10"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={anterior}
              aria-label="Anterior"
              className="absolute left-0 z-10 rounded-full border border-white/30 px-4 py-3 text-xl text-white transition hover:bg-white/10"
            >
              ‹
            </button>
            <div className="relative aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-2xl">
              <SafeImage
                src={actual.url}
                alt={actual.alt || actual.caption || siteName}
                fill
                sizes="100vw"
                className="object-contain"
                loading="eager"
              />
            </div>
            <button
              type="button"
              onClick={siguiente}
              aria-label="Siguiente"
              className="absolute right-0 z-10 rounded-full border border-white/30 px-4 py-3 text-xl text-white transition hover:bg-white/10"
            >
              ›
            </button>
          </div>

          {actual.caption && (
            <p className="mt-4 text-center text-sm font-semibold text-white/90">
              {actual.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
