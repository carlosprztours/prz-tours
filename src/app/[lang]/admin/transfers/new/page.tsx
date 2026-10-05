/**
 * Nueva ruta de traslado.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { requireSection } from "@/lib/admin/access";
import type { Locale } from "@/types";
import { TransferForm } from "../TransferForm";

export default async function NewRoutePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "transfers");
  const es = locale === "es";

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/transfers`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← {es ? "Traslados" : "Transfers"}
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Nueva ruta" : "New route"}
        </h1>
      </div>
      <TransferForm locale={locale} initial={null} es={es} />
    </div>
  );
}
