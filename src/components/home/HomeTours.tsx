/**
 * Todas las excursiones publicadas en la home (rejilla de TourCard +
 * enlace al catálogo con filtros).
 *
 * Usa `listPublishedTours`: todo tour con "Publicado" aparece aquí
 * automáticamente, incluidos los nuevos. El campo "Orden" del panel
 * controla el orden.
 */
import Link from "next/link";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { TourCard } from "@/components/tours/TourCard";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, TourWithContent } from "@/types";

type Props = {
  locale: Locale;
  dict: Dictionary;
  tours: TourWithContent[];
};

export function HomeTours({ locale, dict, tours }: Props) {
  if (tours.length === 0) return null;
  return (
    <section className="py-16 sm:py-20">
      <div className="container-site">
        <SectionHeading title={dict.home.allToursTitle} subtitle={dict.home.allToursSubtitle} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} locale={locale} dict={dict} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={`/${locale}/tours`}
            className="inline-flex h-12 items-center rounded-full border-2 border-ocean-600 px-8 font-display text-base font-bold text-ocean-700 transition hover:bg-ocean-600 hover:text-white"
          >
            {dict.common.viewAllTours}
          </Link>
        </div>
      </div>
    </section>
  );
}
