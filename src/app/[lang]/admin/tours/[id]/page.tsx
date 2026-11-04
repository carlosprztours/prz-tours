/**
 * Editar tour.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminTour } from "@/lib/admin/tours";
import { requireSection } from "@/lib/admin/access";
import { listTourCategories } from "@/lib/admin/categories";
import { tourFormLabels } from "@/lib/admin/tour-labels";
import { getEnvVar, queryOne } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { TourForm } from "../TourForm";

type Props = {
  searchParams: Promise<{ traduccion?: string }>;
  params: Promise<{ lang: string; id: string }>;
};

export default async function EditTourPage({ params, searchParams }: Props) {
  const englishReview = (await searchParams).traduccion === "en";
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "tours");

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const full = await getAdminTour(locale, numericId);
  if (!full) notFound();

  const rows = await listTourCategories(locale);

  const budget = await queryOne<{ calls: number; chars: number; halted: number }>(
    `SELECT CASE WHEN expires_at <= unixepoch() THEN 0 ELSE calls END AS calls,
            CASE WHEN expires_at <= unixepoch() THEN 0 ELSE chars END AS chars,
            CASE WHEN halted = 1 OR halted > unixepoch() THEN 1 ELSE 0 END AS halted
     FROM preview_translation_budget WHERE id = 1`,
  ).catch(() => null);
  const enabled = await getEnvVar("EDITORIAL_TRANSLATION_WORKERS_AI") === "true";

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
      {englishReview ? (
        <a href="?">Volver a la edición en español</a>
      ) : (
        <a href="?traduccion=en">Mantenimiento de traducción inglesa</a>
      )}
      {budget && (
        <p className="text-sm text-ink-600">
          Traducción automática: {enabled && !budget.halted ? "disponible" : "en pausa"}.
          {" "}{Math.max(0, 24 - budget.calls)} inferencias y {Math.max(0, 6000 - budget.chars)} caracteres restantes hoy (UTC).
        </p>
      )}
      <TourForm englishReview={englishReview}
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
