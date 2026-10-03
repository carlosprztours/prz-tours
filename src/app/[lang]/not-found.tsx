/**
 * 404 dentro de un idioma.
 *
 * En Next 16 `not-found` no recibe `params`, así que el idioma se lee de la
 * cabecera `x-locale` que inyecta el proxy (con inglés como fallback).
 */
import { headers } from "next/headers";
import Link from "next/link";

import { getDictionary, isLocale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n/config";
import type { Locale } from "@/types";

export default async function LangNotFound() {
  const headerList = await headers();
  const raw = headerList.get("x-locale") ?? defaultLocale;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl font-extrabold text-ocean-600">404</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">
          {dict.errors.notFoundTitle}
        </h1>
        <p className="mt-2 text-sm text-ink-500">{dict.errors.notFoundBody}</p>
        <Link
          href={`/${locale}`}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-ocean-600 px-6 text-sm font-bold text-white transition hover:bg-ocean-700"
        >
          {dict.errors.goHome}
        </Link>
      </div>
    </div>
  );
}
