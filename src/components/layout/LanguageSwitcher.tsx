/**
 * Selector de idioma ES ⇄ EN (componente de cliente).
 *
 * Mantiene la misma página cambiando solo el prefijo de idioma en la URL.
 * Si la ruta no tiene prefijo reconocido, lleva al inicio del otro idioma.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { locales } from "@/lib/i18n/config";
import type { Locale } from "@/types";

export function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const other: Locale = locale === "es" ? "en" : "es";

  const target = (() => {
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = other;
      return segments.join("/") || "/";
    }
    return `/${other}`;
  })();

  return (
    <Link
      href={target}
      aria-label={
        locale === "es" ? `Ver en English (${other.toUpperCase()})` : `View in Español (${other.toUpperCase()})`
      }
      title={label}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 text-sm font-bold text-ink-700 transition hover:border-ocean-300 hover:text-ocean-700"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
      </svg>
      <span>{locale === "es" ? "EN" : "ES"}</span>
    </Link>
  );
}
