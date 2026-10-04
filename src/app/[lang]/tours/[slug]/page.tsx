/**
 * Detalle de tour: galería, descripción, datos, listas, precio y reserva.
 *
 * Incluye JSON-LD `TouristTrip` + `Offer` para SEO y `generateStaticParams`
 * con todos los slugs (las páginas se generan bajo demanda y se cachean).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingForm } from "@/components/booking/BookingForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { TourCard, formatDuration } from "@/components/tours/TourCard";
import { TourGallery } from "@/components/tours/TourGallery";
import { TourInfo } from "@/components/tours/TourInfo";
import { TourReviews } from "@/components/tours/TourReviews";
import { formatPrice, priceUnitLabel } from "@/lib/i18n/config";
import { DEFAULT_PHONE_DISPLAY } from "@/lib/site";
import { getBookingDefaults } from "@/lib/db/customer";
import { listPublishedTestimonials } from "@/lib/db/content";
import { getTourBySlug, listRelatedTours } from "@/lib/db/tours";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

// Sin generateStaticParams a propósito: la página es 100 % dinámica desde
// D1. (Un generateStaticParams que devuelve [] rompía el render en el
// bundle de OpenNext/Workers aunque en dev funcionaba.)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const tour = await getTourBySlug(slug, lang);
  if (!tour) return {};
  const cover = tour.images[0]?.url;
  return {
    title: tour.translation.seo_title || tour.translation.title,
    description: tour.translation.seo_description || tour.translation.summary,
    alternates: {
      canonical: `/${lang}/tours/${slug}`,
      languages: { es: `/es/tours/${slug}`, en: `/en/tours/${slug}` },
    },
    openGraph: {
      title: tour.translation.title,
      description: tour.translation.summary,
      type: "article",
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
  };
}

export default async function TourDetailPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const tour = await getTourBySlug(slug, locale);
  if (!tour) notFound();

  const [dict, related, defaults, tourReviews] = await Promise.all([
    getDictionary(locale),
    listRelatedTours(tour.id, tour.category, locale),
    getBookingDefaults(),
    listPublishedTestimonials(6, slug),
  ]);

  const paragraphs = tour.translation.description
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.translation.title,
    description: tour.translation.summary,
    touristType: "Tourist",
    offers: {
      "@type": "Offer",
      price: tour.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://pereztours.cloud/${locale}/tours/${slug}`,
    },
    provider: {
      "@type": "TravelAgency",
      name: "Perez Tours & Transfers",
      telephone: DEFAULT_PHONE_DISPLAY,
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="bg-sand-50/50 py-8 sm:py-12">
        <div className="container-site">
          <nav aria-label="breadcrumb" className="mb-5 text-sm text-ink-500">
            <Link href={`/${locale}`} className="hover:text-ocean-700 hover:underline">
              {dict.nav.home}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link href={`/${locale}/tours`} className="hover:text-ocean-700 hover:underline">
              {dict.nav.tours}
            </Link>
            <span aria-hidden="true"> · </span>
            <span aria-current="page" className="font-semibold text-ink-900">
              {tour.translation.title}
            </span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div>
              <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
                {tour.translation.title}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
                <span>{formatDuration(tour.duration_minutes, dict.common)}</span>
              </p>

              <div className="mt-6">
                <TourGallery images={tour.images} title={tour.translation.title} />
              </div>

              <div className="prose-tours mt-8 space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed text-ink-700">
                    {p}
                  </p>
                ))}
              </div>

              <div className="mt-10">
                <TourInfo tour={tour} dict={dict} />
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-lg">
                <p className="text-sm text-ink-500">{dict.common.from}</p>
                <p className="font-display text-4xl font-extrabold text-ink-900">
                  {formatPrice(tour.price)}
                  <span className="ml-2 align-middle font-sans text-sm font-medium text-ink-500">
                    {priceUnitLabel(tour.price_unit, locale)}
                  </span>
                </p>
                <h2 className="mt-5 border-t border-sand-100 pt-5 font-display text-xl font-bold text-ink-900">
                  {dict.booking.title}
                </h2>
                <p className="mb-4 mt-1 text-xs text-ink-500">{dict.booking.subtitle}</p>
                <BookingForm
                  locale={locale}
                  booking={dict.booking}
                  optionalLabel={dict.common.optional}
                  transfersTitle={dict.transfers.title}
                  kind="tour"
                  tours={[{ id: tour.id, title: tour.translation.title, price: tour.price }]}
                  routes={[]}
                  preselectedTourId={tour.id}
                  defaults={defaults}
                />
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
                {dict.tours.relatedTitle}
              </h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((rel) => (
                  <TourCard key={rel.id} tour={rel} locale={locale} dict={dict} />
                ))}
              </div>
            </section>
          )}

          <TourReviews
            locale={locale}
            tourSlug={slug}
            reviews={tourReviews}
            labels={
              locale === "es"
                ? {
                    title: "Opiniones de este tour",
                    formTitle: "¿Hiciste este tour? Cuéntanos",
                    nameLabel: "Tu nombre",
                    namePlaceholder: "Tu nombre",
                    ratingLabel: "Tu valoración",
                    messageLabel: "Tu opinión",
                    messagePlaceholder: "Cuéntanos qué tal estuvo… (mínimo 10 caracteres)",
                    submit: "Publicar opinión",
                    submitting: "Publicando…",
                    successTitle: "¡Gracias por tu opinión!",
                    successBody: "La revisaremos y la publicaremos enseguida.",
                    errorBody: "No pudimos guardar tu opinión. Inténtalo de nuevo.",
                  }
                : {
                    title: "Reviews of this tour",
                    formTitle: "Did this tour? Tell us about it",
                    nameLabel: "Your name",
                    namePlaceholder: "Your name",
                    ratingLabel: "Your rating",
                    messageLabel: "Your review",
                    messagePlaceholder: "Tell us how it went… (at least 10 characters)",
                    submit: "Post review",
                    submitting: "Posting…",
                    successTitle: "Thanks for your review!",
                    successBody: "We'll review it and publish it shortly.",
                    errorBody: "We couldn't save your review. Please try again.",
                  }
            }
          />
        </div>
      </div>
    </>
  );
}
