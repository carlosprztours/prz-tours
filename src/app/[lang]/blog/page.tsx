/**
 * Blog público: índice de artículos.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPublishedArticles } from "@/lib/db/articles";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const title = lang === "es" ? "Blog de viajes" : "Travel blog";
  return {
    title,
    description: dict.meta.defaultDescription,
    alternates: {
      canonical: `/${lang}/blog`,
      languages: { es: "/es/blog", en: "/en/blog" },
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  const [articles] = await Promise.all([listPublishedArticles(locale)]);

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site">
        <SectionHeading
          title={es ? "Blog de viajes" : "Travel blog"}
          subtitle={
            es
              ? "Guías, consejos e historias de Puerto Plata."
              : "Guides, tips and stories from Puerto Plata."
          }
        />

        {articles.length === 0 ? (
          <p className="mx-auto mt-10 max-w-md rounded-2xl border border-sand-200 bg-white p-10 text-center text-sm text-ink-500">
            {es ? "Pronto publicaremos guías." : "Guides coming soon."}
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/${locale}/blog/${a.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {a.cover_url ? (
                  <span className="relative block aspect-[16/9] overflow-hidden bg-sand-100">
                    <Image
                      src={a.cover_url}
                      alt={a.translation.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <span className="flex aspect-[16/9] items-center justify-center bg-ocean-50 text-4xl" aria-hidden="true">
                    🌴
                  </span>
                )}
                <span className="flex flex-1 flex-col p-5">
                  <span className="font-display text-lg font-bold leading-snug text-ink-900 group-hover:text-ocean-700">
                    {a.translation.title}
                  </span>
                  <span className="clamp-2 mt-2 text-sm leading-relaxed text-ink-500">
                    {a.translation.excerpt}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
