/**
 * Tabla de rutas de traslado con precios por tamaño de grupo.
 *
 * En móvil se convierte en tarjetas apiladas (cada fila es un bloque).
 */
import Link from "next/link";

import { formatPrice } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, TransferRoute } from "@/types";

type Props = {
  locale: Locale;
  dict: Dictionary;
  routes: TransferRoute[];
};

export function TransferTable({ locale, dict, routes }: Props) {
  const t = dict.transfers;

  if (routes.length === 0) {
    return (
      <p className="rounded-2xl border border-sand-200 bg-sand-50 p-8 text-center text-sm text-ink-500">
        {t.emptyState}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm">
      {/* Cabecera (solo escritorio) */}
      <div className="hidden grid-cols-[1.4fr_2fr_1fr_1fr_1fr] gap-4 bg-ocean-950 px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-white md:grid">
        <span>{t.tableHeaders.airport}</span>
        <span>{t.tableHeaders.destination}</span>
        <span className="text-right">{t.tableHeaders.small}</span>
        <span className="text-right">{t.tableHeaders.large}</span>
        <span />
      </div>

      <ul className="divide-y divide-sand-100">
        {routes.map((route) => (
          <li
            key={route.id}
            className="grid gap-2 px-6 py-5 transition hover:bg-sand-50 md:grid-cols-[1.4fr_2fr_1fr_1fr_1fr] md:items-center md:gap-4"
          >
            <div>
              <p className="font-display text-sm font-bold text-ink-900">{route.origin_label}</p>
              {route.origin_airport && (
                <p className="text-xs text-ink-500">{route.origin_airport}</p>
              )}
            </div>
            <p className="text-sm text-ink-700">
              <span className="font-semibold md:hidden">{t.tableHeaders.destination}: </span>
              {route.destination}
            </p>
            <p className="text-sm text-ink-900 md:text-right">
              <span className="font-semibold text-ink-500 md:hidden">{t.tableHeaders.small}: </span>
              <strong className="font-display text-lg font-extrabold">{formatPrice(route.price_1_5)}</strong>
            </p>
            <p className="text-sm text-ink-900 md:text-right">
              <span className="font-semibold text-ink-500 md:hidden">{t.tableHeaders.large}: </span>
              <strong className="font-display text-lg font-extrabold">{formatPrice(route.price_6_11)}</strong>
            </p>
            <div className="md:text-right">
              <Link
                href={`/${locale}/book?type=transfer&route=${route.id}`}
                className="inline-flex h-10 items-center rounded-full bg-ocean-600 px-5 text-sm font-bold text-white transition hover:bg-ocean-700"
              >
                {t.ctaButton}
              </Link>
            </div>
            {route.price_note && (
              <p className="text-xs italic text-ink-500 md:col-span-5">{route.price_note}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
