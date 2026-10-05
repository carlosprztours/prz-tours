/**
 * Editar tour.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminTour } from "@/lib/admin/tours";
import { requireSection } from "@/lib/admin/access";
import { listTourCategories } from "@/lib/admin/categories";
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
  await requireSection(locale, "tours");

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const full = await getAdminTour(locale, numericId);
  if (!full) notFound();

  const rows = await listTourCategories(locale);

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
      <TourForm
        locale={locale}
        initial={full}
        labels={tourFormLabels(locale)}
        categories={rows
          .filter((r) => r.is_active === 1)
          .map((r) => ({
            slug: r.slug,
            icon: r.icon,
            label: locale === "es" ? r.label_es : r.label_en || r.label_es,
          }))}
        manageCategories={locale === "es" ? "Gestionar" : "Manage"}
      />
    </div>
  );
}
