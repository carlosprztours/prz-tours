/**
 * Catálogo de tours con filtros por categoría (vía searchParams, sin JS).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { TourCard, categoryLabel } from "@/components/tours/TourCard";
import { listPublishedTours } from "@/lib/db/tours";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ categoria?: string; destacados?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.tours.title,
    description: dict.tours.subtitle,
    alternates: {
      canonical: `/${lang}/tours`,
      languages: { es: "/es/tours", en: "/en/tours" },
    },
  };
}

const CATEGORIES = ["water", "adventure", "culture", "wildlife", "beach"] as const;

export default async function ToursPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const { categoria, destacados } = await searchParams;

  const [dict, all] = await Promise.all([
    getDictionary(locale),
    listPublishedTours(locale),
  ]);

  let tours = all;
  if (destacados === "1") tours = tours.filter((t) => t.is_featured === 1);
  if (categoria && (CATEGORIES as readonly string[]).includes(categoria)) {
    tours = tours.filter((t) => t.category === categoria);
  }

  const base = `/${locale}/tours`;
  const filterLink = (cat?: string) =>
    cat ? `${base}?categoria=${cat}` : base;

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site">
        <SectionHeading title={dict.tours.title} subtitle={dict.tours.subtitle} />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={base}
            aria-current={!categoria && destacados !== "1" ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              !categoria && destacados !== "1"
                ? "bg-ocean-700 text-white"
                : "bg-white text-ink-700 ring-1 ring-sand-200 hover:ring-ocean-300"
            }`}
          >
            {dict.tours.filterAll}
          </Link>
          {CATEGORIES.map((cat) => {
            const active = categoria === cat;
            return (
              <Link
                key={cat}
                href={filterLink(cat)}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-ocean-700 text-white"
                    : "bg-white text-ink-700 ring-1 ring-sand-200 hover:ring-ocean-300"
                }`}
              >
                {categoryLabel(cat, dict.tours)}
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm text-ink-500" role="status">
          {dict.tours.resultsCount(tours.length)}
        </p>

        {tours.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-sand-200 bg-white p-10 text-center">
            <p className="font-display text-lg font-bold text-ink-900">{dict.tours.emptyState}</p>
            <p className="mt-2 text-sm text-ink-500">{dict.tours.emptyStateHint}</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} locale={locale} dict={dict} />
            ))}
          </div>
        )}

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-dashed border-ocean-300 bg-ocean-50 p-8 text-center">
          <h2 className="font-display text-xl font-extrabold text-ink-900">
            {dict.booking.customCtaTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-600">
            {dict.booking.customCtaBody}
          </p>
          <Link
            href={`/${locale}/book?type=custom`}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-ocean-700 px-6 text-sm font-bold text-white transition hover:bg-ocean-800"
          >
            {dict.booking.customCtaButton}
          </Link>
        </div>
      </div>
    </div>
  );
}
