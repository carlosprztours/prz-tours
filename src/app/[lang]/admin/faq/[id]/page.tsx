/**
 * Editar pregunta frecuente.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminFaq } from "@/lib/admin/faqs";
import { requireSection } from "@/lib/admin/access";
import { readEditorialEnglishBatch } from "@/lib/db/editorial-cache";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { FaqForm } from "../FaqForm";

export default async function EditFaqPage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ traduccion?: string }>;
  params: Promise<{ lang: string; id: string }>;
}) {
  const englishReview = (await searchParams).traduccion === "en";
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "faq");

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  const faq = await getAdminFaq(locale, numericId);
  if (!faq) notFound();
  const source = faq.answer_es;
  const draft = englishReview && source ? (await readEditorialEnglishBatch([source]))(source) : "";

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/faq`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← FAQ
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {faq.question_es}
        </h1>
      </div>
      {englishReview ? (
        <a href="?">Volver a la edición en español</a>
      ) : (
        <a href="?traduccion=en">Mantenimiento de traducción inglesa</a>
      )}
      {draft && (
        <details>
          <summary>Borrador inglés para revisar antes de guardarlo</summary>
          <p lang="es" className="whitespace-pre-wrap">{source}</p>
          <p lang="en" className="whitespace-pre-wrap">{draft}</p>
        </details>
      )}
      <FaqForm englishReview={englishReview} locale={locale} initial={faq} es={locale === "es"} />
    </div>
  );
}
