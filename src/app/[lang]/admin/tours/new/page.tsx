/**
 * Nuevo tour.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { tourFormLabels } from "@/lib/admin/tour-labels";
import { requireSection } from "@/lib/admin/access";
import { listTourCategories } from "@/lib/admin/categories";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { TourForm } from "../TourForm";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function NewTourPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "tours");
  const es = locale === "es";
  const rows = await listTourCategories(locale);

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/tours`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← Tours
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Nuevo tour" : "New tour"}
        </h1>
      </div>
      <TourForm
        locale={locale}
        initial={null}
        labels={tourFormLabels(locale)}
        categories={rows
          .filter((r) => r.is_active === 1)
          .map((r) => ({
            slug: r.slug,
            icon: r.icon,
            label: locale === "es" ? r.label_es : r.label_en || r.label_es,
          }))}
        manageCategories={es ? "Gestionar" : "Manage"}
      />
    </div>
  );
}
