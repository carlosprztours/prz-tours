/**
 * Carrusel Hero: reemplaza la imagen estática del Hero por un carrusel de fotos.
 *
 * - Autoplay con pausa al hover/foco
 * - Navegación por puntos, teclado (←/→) y swipe táctil
 * - Imagen prioritaria en la primera, lazy-load en el resto
 * - Mantiene el mismo layout del Hero: fondo cover + overlay + contenido encima
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

type Slide = {
  src: string;
  alt: string;
  caption?: string;
};

type Props = {
  slides: Slide[];
  /** ms entre transiciones automáticas */
  intervalMs?: number;
};

export function HeroCarousel({ slides, intervalMs = 6000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback(
    (i: number) => setIndex(() => (i + slides.length) % slides.length),
    [slides.length],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!paused) next();
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, paused, intervalMs, slides.length]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 40) prev();
    if (dx < -40) next();
    touchStartX.current = null;
  };

  // Pausa al hover/foco del contenedor
  const onMouseEnter = () => setPaused(true);
  const onMouseLeave = () => setPaused(false);
  const onFocus = () => setPaused(true);
  const onBlur = () => setPaused(false);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-label="Carrusel de fotos principales"
    >
      {/* Imágenes */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: 1 }}
        role="list"
        aria-live="polite"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            role="listitem"
            aria-hidden={i !== index}
            aria-current={i === index ? "true" : "false"}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              fetchPriority={i === 0 ? "high" : "auto"}
              sizes="100vw"
              className="object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
            {slide.caption && (
              <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white text-sm text-center">
                {slide.caption}
              </figcaption>
            )}
          </div>
        ))}
      </div>

      {/* Overlay degradado (igual que Hero original) */}
      <div className="absolute inset-0 bg-gradient-to-t from-ocean-950 via-ocean-950/40 to-transparent" aria-hidden="true" />

      {/* Puntos de navegación */}
      {slides.length > 1 && (
        <nav
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2"
          aria-label="Navegación del carrusel"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? "bg-white scale-125" : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Ver imagen ${i + 1} de ${slides.length}`}
              aria-current={i === index ? "true" : "false"}
            />
          ))}
        </nav>
      )}

      {/* Flechas prev/next (opcional, solo desktop) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition"
            aria-label="Imagen anterior"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition"
            aria-label="Siguiente imagen"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}