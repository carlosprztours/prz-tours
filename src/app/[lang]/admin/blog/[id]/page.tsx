/**
 * Editar artículo.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminArticle } from "@/lib/admin/articles";
import { requireSection } from "@/lib/admin/access";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { ArticleForm } from "../ArticleForm";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "blog");

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  const full = await getAdminArticle(locale, numericId);
  if (!full) notFound();

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
      <ArticleForm locale={locale} initial={full} es={locale === "es"} />
    </div>
  );
}
