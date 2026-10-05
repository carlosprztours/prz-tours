/**
 * Editar ruta de traslado.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminRoute } from "@/lib/admin/transfers";
import { requireSection } from "@/lib/admin/access";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { TransferForm } from "../TransferForm";

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "transfers");
  const es = locale === "es";

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const route = await getAdminRoute(locale, numericId);
  if (!route) notFound();

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/transfers`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← {es ? "Traslados" : "Transfers"}
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {route.origin_label}
        </h1>
      </div>
      <TransferForm locale={locale} initial={route} es={es} />
    </div>
  );
}
