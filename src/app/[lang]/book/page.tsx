/**
 * Reserva general: formulario con selector de tour o de ruta de traslado.
 *
 * - `/book` → reserva de tour (selector de tours).
 * - `/book?type=transfer` → reserva de traslado (selector de rutas).
 * - `/book?type=transfer&route=3` → traslado con ruta preseleccionada.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingForm } from "@/components/booking/BookingForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getCurrentUser } from "@/lib/auth/dal";
import { listPublishedTransferRoutes } from "@/lib/db/content";
import { getBookingDefaults } from "@/lib/db/customer";
import { listPublishedTours } from "@/lib/db/tours";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ type?: string; route?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.nav.bookNow,
    description: dict.booking.subtitle,
    alternates: {
      canonical: `/${lang}/book`,
      languages: { es: "/es/book", en: "/en/book" },
    },
  };
}

export default async function BookPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const { type, route } = await searchParams;

  const kind = type === "transfer" ? "transfer" : type === "custom" ? "custom" : "tour";
  const routeId = route ? Number(route) : undefined;

  const [dict, tours, routes, defaults] = await Promise.all([
    getDictionary(locale),
    listPublishedTours(locale),
    listPublishedTransferRoutes(),
    getBookingDefaults(),
  ]);
  const session = await getCurrentUser().catch(() => null);
  const returnPath =
    kind === "transfer"
      ? `/${locale}/book?type=transfer${Number.isInteger(routeId) ? `&route=${routeId}` : ""}`
      : kind === "custom"
        ? `/${locale}/book?type=custom`
        : `/${locale}/book`;

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site">
        <SectionHeading
          title={kind === "custom" ? dict.booking.customTitle : dict.nav.bookNow}
          subtitle={dict.booking.subtitle}
        />
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-sand-200 bg-white p-6 shadow-lg sm:p-8">
          <BookingForm
            locale={locale}
            booking={dict.booking}
            optionalLabel={dict.common.optional}
            transfersTitle={dict.transfers.title}
            kind={kind}
            tours={tours.map((t) => ({
              id: t.id,
              title: t.translation.title,
              price: t.price,
            }))}
            routes={routes.map((r) => ({
              id: r.id,
              label: `${r.origin_label} → ${r.destination}`,
              price15: r.price_1_5,
              price611: r.price_6_11,
            }))}
            preselectedRouteId={Number.isInteger(routeId) ? routeId : undefined}
            defaults={defaults}
            isAuthenticated={session !== null}
            returnPath={returnPath}
          />
        </div>
      </div>
    </div>
  );
}
