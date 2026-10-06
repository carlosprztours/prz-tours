import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPage } from "@/components/layout/LegalPage";
import { getActualizado, getLegal } from "@/lib/legal";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const doc = getLegal(lang as Locale, "cookies");
  return {
    title: doc.titulo,
    robots: { index: true, follow: true },
    alternates: { canonical: `/${lang}/cookies` },
  };
}

export default async function CookiesPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const doc = getLegal(locale, "cookies");
  return <LegalPage titulo={doc.titulo} actualizado={getActualizado(locale)} parrafos={doc.parrafos} />;
}
