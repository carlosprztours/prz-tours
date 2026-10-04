/**
 * Artículo del blog con JSON-LD `Article`.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { getArticleBySlug } from "@/lib/db/articles";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const article = await getArticleBySlug(slug, lang);
  if (!article) return {};
  return {
    title: article.translation.seo_title || article.translation.title,
    description: article.translation.seo_description || article.translation.excerpt,
    alternates: {
      canonical: `/${lang}/blog/${slug}`,
      languages: { es: `/es/blog/${slug}`, en: `/en/blog/${slug}` },
    },
    openGraph: {
      title: article.translation.title,
      description: article.translation.excerpt,
      type: "article",
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const article = await getArticleBySlug(slug, locale);
  if (!article) notFound();

  const paragraphs = article.translation.body
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.translation.title,
    description: article.translation.excerpt,
    author: { "@type": "Organization", name: "Perez Tours & Transfers" },
    datePublished: article.created_at,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="bg-sand-50/50 py-8 sm:py-12">
        <div className="container-site max-w-3xl">
          <nav aria-label="breadcrumb" className="mb-5 text-sm text-ink-500">
            <Link href={`/${locale}`} className="hover:text-ocean-700 hover:underline">
              {locale === "es" ? "Inicio" : "Home"}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link href={`/${locale}/blog`} className="hover:text-ocean-700 hover:underline">
              Blog
            </Link>
            <span aria-hidden="true"> · </span>
            <span aria-current="page" className="font-semibold text-ink-900">
              {article.translation.title}
            </span>
          </nav>

          <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            {article.translation.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-500">
            {article.translation.excerpt}
          </p>

          {article.cover_url && (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-sand-100">
              <Image
                src={article.cover_url}
                alt={article.translation.title}
                fill
                priority
                sizes="(min-width: 768px) 66vw, 100vw"
                className="object-cover"
              />
            </div>
          )}

          <div className="mt-8 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="leading-relaxed text-ink-700">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href={`/${locale}/tours`}
              className="inline-flex h-12 items-center rounded-full bg-coral-700 px-8 font-display text-base font-bold text-white shadow-xl transition hover:bg-coral-800"
            >
              {locale === "es" ? "Ver tours" : "View tours"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
