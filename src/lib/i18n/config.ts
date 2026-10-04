/**
 * Configuración de idiomas.
 *
 * El sitio usa rutas con prefijo de idioma: /es/... y /en/...
 * `src/proxy.ts` redirige cualquier ruta sin locale hacia el idioma detectado.
 */
import type { Locale } from "@/types";

export const locales: Locale[] = ["es", "en"];

/**
 * Idioma por defecto cuando no se puede detectar el del visitante.
 * Es inglés porque el público principal son turistas internacionales
 * (igual que el sitio original, que era 100 % inglés).
 */
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

/**
 * Formatea un precio en USD sin decimales innecesarios ("$60", "$1,250").
 * Un solo formato en todo el sitio (cards, detalle, traslados, WhatsApp).
 */
export function formatPrice(value: number, currency = "USD"): string {
  const rounded = Math.round(value * 100) / 100;
  const text = rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return currency === "USD" ? `$${text}` : `${text} ${currency}`;
}

/** Etiqueta de la unidad de precio ("por persona", "por buggy"...). */
export function priceUnitLabel(
  unit: "person" | "vehicle" | "group",
  locale: Locale,
): string {
  const labels: Record<"person" | "vehicle" | "group", Record<Locale, string>> = {
    person: { es: "por persona", en: "per person" },
    vehicle: { es: "por vehículo", en: "per vehicle" },
    group: { es: "por grupo", en: "per group" },
  };
  return labels[unit][locale];
}
