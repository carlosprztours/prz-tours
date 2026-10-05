/**
 * Índice de códigos promocionales del panel.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deletePromo, listAdminPromos } from "@/lib/admin/promos";
import { requireSection } from "@/lib/admin/access";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

export default async function AdminPromosPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "promos");
  const es = locale === "es";

  const items = await listAdminPromos(locale);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Promociones" : "Promos"} · {items.length}
        </h1>
        <Link
          href={`/${locale}/admin/promos/new`}
          className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "+ Nuevo código" : "+ New code"}
        </Link>
      </div>

      <ul className="grid gap-3">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-4"
          >
            <div>
              <p className="font-mono font-display text-lg font-extrabold tracking-wide text-ink-900">
                {p.code}
                {!p.is_active && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 font-sans text-xs font-bold text-slate-600">
                    {es ? "Inactivo" : "Inactive"}
                  </span>
                )}
              </p>
              <p className="text-xs text-ink-500">
                {p.kind === "percent" ? `−${p.value}%` : `−$${p.value}`}
                {p.max_uses ? ` · ${p.used_count}/${p.max_uses} usos` : ` · ${p.used_count} usos`}
                {p.valid_to ? ` · hasta ${p.valid_to}` : ""}
              </p>
            </div>
            <span className="flex gap-2">
              <Link
                href={`/${locale}/admin/promos/${p.id}`}
                className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-200"
              >
                {es ? "Editar" : "Edit"}
              </Link>
              <DeleteButton
                locale={locale}
                id={p.id}
                action={deletePromo}
                confirmMessage={es ? `¿Eliminar el código ${p.code}?` : `Delete code ${p.code}?`}
                label={es ? "Eliminar" : "Delete"}
              />
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-sand-200 bg-white p-10 text-center text-sm text-ink-500">
            {es ? "Sin códigos. Crea el primero." : "No codes yet. Create the first one."}
          </li>
        )}
      </ul>
    </div>
  );
}
