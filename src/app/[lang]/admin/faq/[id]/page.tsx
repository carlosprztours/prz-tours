/**
 * Editar pregunta frecuente.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminFaq } from "@/lib/admin/faqs";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { FaqForm } from "../FaqForm";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  const faq = await getAdminFaq(locale, numericId);
  if (!faq) notFound();

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
      <FaqForm locale={locale} initial={faq} es={locale === "es"} />
    </div>
  );
}
