/**
 * Nueva pregunta frecuente.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { FaqForm } from "../FaqForm";

export default async function NewFaqPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/faq`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← FAQ
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Nueva pregunta" : "New question"}
        </h1>
      </div>
      <FaqForm locale={locale} initial={null} es={es} />
    </div>
  );
}
