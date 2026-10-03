/**
 * Nuevo testimonio.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { TestimonialForm } from "../TestimonialForm";

export default async function NewTestimonialPage({
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
        <Link href={`/${locale}/admin/testimonials`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← {es ? "Opiniones" : "Reviews"}
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Nuevo testimonio" : "New review"}
        </h1>
      </div>
      <TestimonialForm locale={locale} initial={null} es={es} />
    </div>
  );
}
