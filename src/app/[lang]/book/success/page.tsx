/**
 * Vuelta de Stripe tras pagar (o cancelar).
 *
 * Si viene con `?ref=`, muestra la reserva y su estado actual.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getBookingByReference } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export default async function PaymentReturnPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";
  const { ref } = await searchParams;

  const booking = ref ? await getBookingByReference(ref.trim().toUpperCase()) : null;

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site max-w-xl text-center">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-lg">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">
            {es ? "¡Gracias por tu pago!" : "Thanks for your payment!"}
          </h1>
          {booking ? (
            <>
              <p className="mt-2 text-sm text-ink-600">
                {es ? "Referencia" : "Reference"}:{" "}
                <strong className="font-mono">{booking.reference}</strong>
              </p>
              <p className="mt-1 text-sm text-ink-600">
                {es
                  ? "Estamos confirmando tu pago y te avisaremos por WhatsApp."
                  : "We're confirming your payment and will notify you on WhatsApp."}
              </p>
              <Link
                href={`/${locale}/track?ref=${booking.reference}`}
                className="mt-6 inline-flex h-11 items-center rounded-full bg-ocean-700 px-6 text-sm font-bold text-white transition hover:bg-ocean-800"
              >
                {es ? "Ver mi reserva" : "View my booking"}
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-600">
              {es
                ? "Si pagaste, recibirás la confirmación en breve."
                : "If you paid, you'll receive confirmation shortly."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
