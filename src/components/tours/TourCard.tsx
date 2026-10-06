/**
 * Tarjeta de tour para catálogos y destacados.
 *
 * Foto, categoría, título, resumen, duración, precio y CTA.
 * Toda la navegación usa el prefijo de idioma.
 */
import Link from "next/link";

import { SafeImage } from "@/components/SafeImage";
import { formatPrice, priceUnitLabel } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, TourWithContent } from "@/types";

export const categoryIcons: Record<string, string> = {
  water: "💧",
  adventure: "🏍️",
  culture: "🏛️",
  wildlife: "🐒",
  beach: "🏝️",
  other: "✨",
};

/**
 * Etiqueta legible de una categoría.
 * Las 6 históricas vienen del diccionario (traducidas); las creadas desde el
 * panel usan el `label` de `tour_categories`, que se pasa como `custom`.
 */
export function categoryLabel(
  category: string,
  dict: Dictionary["tours"],
  custom?: string,
): string {
  switch (category) {
    case "water":
      return dict.categoryWater;
    case "adventure":
      return dict.categoryAdventure;
    case "culture":
      return dict.categoryCulture;
    case "wildlife":
      return dict.categoryWildlife;
    case "beach":
      return dict.categoryBeach;
    default:
      return custom?.trim() || dict.categoryOther;
  }
}

/** Icono de la categoría (emoji). `custom` gana si viene de la BD. */
export function categoryIcon(category: string, custom?: string): string {
  return custom?.trim() || categoryIcons[category] || "✨";
}

/** "8 h" / "4 h 30 min" a partir de minutos. */
export function formatDuration(minutes: number, dict: Dictionary["common"]): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} ${dict.minutes}`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} ${dict.minutes}`;
}

type Props = {
  tour: TourWithContent;
  locale: Locale;
  dict: Dictionary;
  /** Categorías dinámicas (`tour_categories`) para etiqueta e icono propios. */
  categories?: Map<string, { label: string; icon: string }>;
};

export function TourCard({ tour, locale, dict, categories }: Props) {
  const cover = tour.images[0];
  const href = `/${locale}/tours/${tour.slug}`;
  const meta = categories?.get(tour.category);
  const label = categoryLabel(tour.category, dict.tours, meta?.label);
  const icon = categoryIcon(tour.category, meta?.icon);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-sand-100">
        {cover ? (
          <SafeImage
            src={cover.url}
            alt={cover.alt || tour.translation.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl" aria-hidden="true">
            {icon}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-ocean-950/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {icon} {label}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-ink-900">
          <Link href={href} className="transition group-hover:text-ocean-700">
            {tour.translation.title}
          </Link>
        </h3>
        <p className="clamp-2 mt-2 text-sm leading-relaxed text-ink-500">
          {tour.translation.summary}
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-ink-500">
          <span className="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ocean-600" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 2" />
            </svg>
            {formatDuration(tour.duration_minutes, dict.common)}
          </span>
          {tour.age_min != null && tour.age_min > 0 && (
            <span className="inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ocean-600" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path strokeLinecap="round" d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
              </svg>
              {dict.tours.ageMin(tour.age_min)}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-sand-100 pt-4">
          <p className="text-sm text-ink-500">
            {dict.common.from}
            <span className="block font-display text-2xl font-extrabold text-ink-900">
              {formatPrice(tour.price)}
              <span className="ml-1 align-middle font-sans text-xs font-medium text-ink-500">
                {priceUnitLabel(tour.price_unit, locale)}
              </span>
            </span>
          </p>
          <Link
            href={href}
            className="inline-flex h-10 items-center rounded-full bg-ocean-600 px-5 text-sm font-bold text-white transition hover:bg-ocean-700"
          >
            {dict.common.viewTour}
          </Link>
        </div>
      </div>
    </article>
  );
}
