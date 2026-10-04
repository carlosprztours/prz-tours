/**
 * Editar código promocional.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminPromo } from "@/lib/admin/promos";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { PromoForm } from "../PromoForm";

export default async function EditPromoPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  const promo = await getAdminPromo(locale, numericId);
  if (!promo) notFound();

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/admin/promos`} className="text-sm font-bold text-ocean-700 hover:underline">
          ← {locale === "es" ? "Promociones" : "Promos"}
        </Link>
        <h1 className="font-mono font-display text-2xl font-extrabold text-ink-900">
          {promo.code}
        </h1>
      </div>
      <PromoForm locale={locale} initial={promo} es={locale === "es"} />
    </div>
  );
}
