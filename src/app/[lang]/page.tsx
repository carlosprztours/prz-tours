/**
 * Home: hero, por qué elegirnos, destacados, testimonios, galería y CTA.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CtaBanner } from "@/components/home/CtaBanner";
import { HomeTours } from "@/components/home/HomeTours";
import { Gallery } from "@/components/home/Gallery";
import { Hero } from "@/components/home/Hero";
import { Testimonials } from "@/components/home/Testimonials";
import { WhyUs } from "@/components/home/WhyUs";
import { JsonLd } from "@/components/seo/JsonLd";
import { GalleryVideos } from "@/components/gallery/GalleryVideos";
import {
  countPublishedGalleryImages,
  listPublishedGalleryImages,
  listPublishedTestimonials,
  listPublishedGalleryVideos,
} from "@/lib/db/content";
import { getSetting } from "@/lib/db/content";
import { listPublishedTours } from "@/lib/db/tours";
import { getDictionary, isLocale } from "@/lib/i18n";
import { DEFAULT_PHONE_DISPLAY } from "@/lib/site";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: `${dict.meta.siteName} · ${dict.meta.tagline}`,
    description: dict.meta.defaultDescription,
    alternates: {
      canonical: `/${lang}`,
      languages: { es: "/es", en: "/en" },
    },
    openGraph: {
      title: `${dict.meta.siteName} · ${dict.meta.tagline}`,
      description: dict.meta.defaultDescription,
      type: "website",
      locale: lang === "es" ? "es_DO" : "en_GB",
      images: [{ url: "/img/island-hero.jpg", width: 1200, height: 630 }],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const [dict, all, testimonials, gallery, phoneDisplay, galleryTotal, videos] = await Promise.all([
    getDictionary(locale),
    listPublishedTours(locale),
    listPublishedTestimonials(6),
    listPublishedGalleryImages(8),
    getSetting("phone_display", DEFAULT_PHONE_DISPLAY),
    countPublishedGalleryImages(),
    listPublishedGalleryVideos(),
  ]);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Perez Tours & Transfers",
    description: dict.meta.defaultDescription,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Puerto Plata",
      addressCountry: "DO",
    },
    telephone: phoneDisplay,
    email: "asistencia@perez-tours.com",
    url: "https://www.perez-tours.com",
    priceRange: "$40 - $125",
  };

  return (
    <>
      <JsonLd data={orgJsonLd} />
      <Hero locale={locale} dict={dict} stats={{ tours: all.length }} />
      <WhyUs dict={dict} />
      <HomeTours locale={locale} dict={dict} tours={all} />
      <Testimonials locale={locale} dict={dict} testimonials={testimonials} />
      <Gallery dict={dict} locale={locale} images={gallery} total={galleryTotal} />
      <GalleryVideos videos={videos} />
      <CtaBanner locale={locale} dict={dict} />
    </>
  );
}
