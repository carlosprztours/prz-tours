/**
 * Galería pública: todas las fotos que el admin o el fotógrafo ha subido.
 *
 * La home solo enseña unas pocas; esta página las enseña todas. Solo entran las
 * marcadas como publicadas, así que el admin puede dejar preparada una foto sin
 * que aparezca en la web.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryVideos } from "@/components/gallery/GalleryVideos";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  listAllPublishedGalleryImages,
  listPublishedGalleryVideos,
} from "@/lib/db/content";
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
    title: dict.gallery.title,
    description: dict.gallery.subtitle,
    alternates: {
      canonical: `/${lang}/gallery`,
      languages: { es: "/es/gallery", en: "/en/gallery" },
    },
  };
}

export default async function GalleryPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const [dict, images, videos] = await Promise.all([
    getDictionary(locale),
    listAllPublishedGalleryImages(),
    listPublishedGalleryVideos(),
  ]);

  return (
    <main className="py-14 sm:py-20">
      <div className="container-site">
        <SectionHeading title={dict.gallery.title} subtitle={dict.gallery.subtitle} />

        {images.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-sand-200 bg-white/60 p-10 text-center">
            <p className="font-display text-lg font-bold text-ink-900">
              {dict.gallery.emptyState}
            </p>
            <p className="mt-2 text-sm text-ink-500">{dict.gallery.emptyStateHint}</p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm font-semibold text-ink-500">{dict.gallery.count(images.length)}</p>
            <GalleryGrid images={images} siteName={dict.meta.siteName} />
          </>
        )}

        <GalleryVideos videos={videos} />

        <div className="mt-12 flex justify-center">
          <Link
            href={`/${locale}`}
            className="inline-flex h-11 items-center rounded-full border border-ocean-200 px-6 text-sm font-bold text-ocean-800 transition hover:bg-ocean-50"
          >
            ← {dict.gallery.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}