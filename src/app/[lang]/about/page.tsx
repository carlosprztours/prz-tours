/**
 * Nosotros: misión, experiencia local y calidad, con sus fotos.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { getSetting } from "@/lib/db/content";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.about.title,
    description: dict.about.subtitle,
    alternates: {
      canonical: `/${lang}/about`,
      languages: { es: "/es/about", en: "/en/about" },
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const [dict, mission] = await Promise.all([
    getDictionary(locale),
    getSetting("mission", ""),
  ]);

  const blocks = [
    {
      title: dict.about.localTitle,
      text: dict.about.localText,
      img: "/img/about-local.jpg",
      alt: dict.about.localImage,
    },
    {
      title: dict.about.qualityTitle,
      text: dict.about.qualityText,
      img: "/img/about-quality.jpg",
      alt: dict.about.qualityImage,
    },
  ];

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site">
        <SectionHeading title={dict.about.title} subtitle={dict.about.subtitle} />

        {mission && (
          <div className="mx-auto mt-10 grid max-w-5xl items-center gap-8 md:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand-100">
              <Image
                src="/img/about-mission.jpg"
                alt={dict.about.missionTitle}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-ink-900">
                {dict.about.missionTitle}
              </h2>
              <p className="mt-3 leading-relaxed text-ink-700">{mission}</p>
            </div>
          </div>
        )}

        <div className="mx-auto mt-12 grid max-w-5xl gap-8">
          {blocks.map((block, i) => (
            <div
              key={block.title}
              className="grid items-center gap-8 rounded-2xl border border-sand-200 bg-white p-6 sm:p-8 md:grid-cols-2"
            >
              <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand-100 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <Image
                  src={block.img}
                  alt={block.alt}
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div className={i % 2 === 1 ? "md:order-1" : ""}>
                <h2 className="font-display text-2xl font-extrabold text-ink-900">
                  {block.title}
                </h2>
                <p className="mt-3 leading-relaxed text-ink-700">{block.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/tours`}
            className="inline-flex h-12 items-center rounded-full bg-coral-500 px-8 font-display text-base font-bold text-white shadow-xl shadow-coral-500/30 transition hover:bg-coral-600"
          >
            {dict.nav.bookNow}
          </Link>
        </div>
      </div>
    </div>
  );
}
