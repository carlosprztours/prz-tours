/**
 * Editar artículo.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminArticle } from "@/lib/admin/articles";
import { requireSection } from "@/lib/admin/access";
import { readEditorialEnglishBatch } from "@/lib/db/editorial-cache";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { ArticleForm } from "../ArticleForm";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ traduccion?: string }>;
  params: Promise<{ lang: string; id: string }>;
}) {
  const englishReview = (await searchParams).traduccion === "en";
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "blog");

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  const full = await getAdminArticle(locale, numericId);
  if (!full) notFound();
  const source = full.translations.es?.body ?? "";
  const draft = englishReview && source ? (await readEditorialEnglishBatch([source]))(source) : "";

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/blog`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← Blog
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {full.translations.es?.title ?? full.translations.en?.title ?? full.article.slug}
        </h1>
      </div>
      {englishReview ? (
        <a href="?">Volver a la edición en español</a>
      ) : (
        <a href="?traduccion=en">Mantenimiento de traducción inglesa</a>
      )}
      {draft && (
        <details>
          <summary>Borrador inglés para revisar antes de guardarlo</summary>
          <p lang="es" className="whitespace-pre-wrap">{source}</p>
          <p lang="en" className="whitespace-pre-wrap">{draft}</p>
        </details>
      )}
      <ArticleForm englishReview={englishReview} locale={locale} initial={full} es={locale === "es"} />
    </div>
  );
}
