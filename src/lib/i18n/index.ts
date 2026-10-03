/**
 * Carga del diccionario según el idioma de la URL.
 *
 * Como todas las páginas son Server Components, el diccionario se importa solo
 * en el servidor: nunca entra en el bundle de JavaScript del cliente.
 */
import "server-only";

import { defaultLocale, isLocale } from "./config";
import type { Locale } from "@/types";
import type { es } from "./dictionaries/es";

export { defaultLocale, isLocale };
export { locales } from "./config";

export type Dictionary = typeof es;

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  es: () => import("./dictionaries/es").then((m) => m.es as Dictionary),
  en: () => import("./dictionaries/en").then((m) => m.en as Dictionary),
};

/** Devuelve el diccionario del idioma pedido, o el de inglés si no existe. */
export async function getDictionary(locale: string): Promise<Dictionary> {
  const code: Locale = isLocale(locale) ? locale : defaultLocale;
  return loaders[code]();
}

export type { Locale };
