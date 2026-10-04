/**
 * Editar tour.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminTour } from "@/lib/admin/tours";
import { tourFormLabels } from "@/lib/admin/tour-labels";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { TourForm } from "../TourForm";

type Props = {
  params: Promise<{ lang: string; id: string }>;
};

export default async function EditTourPage({ params }: Props) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const full = await getAdminTour(locale, numericId);
  if (!full) notFound();

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/tours`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← Tours
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {full.translations.es?.title ?? full.translations.en?.title ?? full.tour.slug}
        </h1>
      </div>
      <TourForm locale={locale} initial={full} labels={tourFormLabels(locale)} />
    </div>
  );
}
