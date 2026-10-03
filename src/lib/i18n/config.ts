/**
 * Configuración de idiomas.
 *
 * El sitio usa rutas con prefijo de idioma: /es/... y /en/...
 * `src/proxy.ts` redirige cualquier ruta sin locale hacia el idioma detectado.
 */
import type { Locale, LocaleOption } from "@/types";

export const locales: Locale[] = ["es", "en"];

/**
 * Idioma por defecto cuando no se puede detectar el del visitante.
 * Es inglés porque el público principal son turistas internacionales
 * (igual que el sitio original, que era 100 % inglés).
 */
export const defaultLocale: Locale = "en";

export const localeOptions: LocaleOption[] = [
  {
    code: "es",
    label: "Español",
    currency: "USD",
    localeTag: "es-DO",
  },
  { code: "en", label: "English", currency: "USD", localeTag: "en-US" },
];

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

export function getLocaleOption(locale: Locale): LocaleOption {
  return localeOptions.find((o) => o.code === locale) ?? localeOptions[0];
}

/** Nombre corto de la moneda para los precios. */
export const currencySymbol = "$";

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
