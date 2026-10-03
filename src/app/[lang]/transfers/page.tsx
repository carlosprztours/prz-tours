/**
 * Traslados: tabla de rutas y CTA.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { TransferTable } from "@/components/transfers/TransferTable";
import { listPublishedTransferRoutes } from "@/lib/db/content";
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
    title: dict.transfers.title,
    description: dict.transfers.subtitle,
    alternates: {
      canonical: `/${lang}/transfers`,
      languages: { es: "/es/transfers", en: "/en/transfers" },
    },
  };
}

export default async function TransfersPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const [dict, routes] = await Promise.all([
    getDictionary(locale),
    listPublishedTransferRoutes(),
  ]);

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site">
        <SectionHeading title={dict.transfers.title} subtitle={dict.transfers.subtitle} />

        <div className="mx-auto mt-10 max-w-5xl">
          <TransferTable locale={locale} dict={dict} routes={routes} />
          <p className="mt-4 text-center text-xs text-ink-500">{dict.transfers.footnote}</p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl bg-ocean-950 p-8 text-center text-white sm:p-10">
          <h2 className="font-display text-2xl font-extrabold">{dict.transfers.ctaTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/80">{dict.transfers.ctaBody}</p>
          <Link
            href={`/${locale}/book?type=transfer`}
            className="mt-6 inline-flex h-12 items-center rounded-full bg-coral-700 px-8 font-display text-base font-bold text-white shadow-xl shadow-coral-500/30 transition hover:bg-coral-800"
          >
            {dict.transfers.ctaButton}
          </Link>
        </div>
      </div>
    </div>
  );
}
