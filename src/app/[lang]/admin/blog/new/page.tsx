/**
 * Nuevo artículo.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { ArticleForm } from "../ArticleForm";

export default async function NewArticlePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/blog`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← Blog
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Nuevo artículo" : "New article"}
        </h1>
      </div>
      <ArticleForm locale={locale} initial={null} es={es} />
    </div>
  );
}
