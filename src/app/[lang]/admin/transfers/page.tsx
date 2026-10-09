/**
 * Índice de rutas de traslado del panel.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteRoute, listAdminRoutes } from "@/lib/admin/transfers";
import { requireSection } from "@/lib/admin/access";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AdminTransfersPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "transfers");
  const es = locale === "es";

  const routes = await listAdminRoutes(locale);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Traslados" : "Transfers"} · {routes.length}
        </h1>
        <Link
          href={`/${locale}/admin/transfers/new`}
          className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "+ Nueva ruta" : "+ New route"}
        </Link>
      </div>

      <div className="grid gap-3 md:hidden">
        {routes.map((r) => (
          <div key={r.id} className="rounded-2xl border border-sand-200 bg-white p-4">
            <p className="font-display text-sm font-bold text-ink-900">{r.origin_label}</p>
            {r.origin_airport && <p className="text-xs text-ink-500">{r.origin_airport}</p>}
            <p className="mt-1 text-sm text-ink-700">{r.destination}</p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span>
                <span className="text-xs text-ink-500">1–5: </span>
                <strong className="font-display font-extrabold">${r.price_1_5}</strong>
              </span>
              <span>
                <span className="text-xs text-ink-500">6+: </span>
                <strong className="font-display font-extrabold">${r.price_6_11}</strong>
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/${locale}/admin/transfers/${r.id}`}
                className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800"
              >
                {es ? "Editar" : "Edit"}
              </Link>
              <DeleteButton
                locale={locale}
                id={r.id}
                action={deleteRoute}
                confirmMessage={es ? `¿Eliminar la ruta ${r.origin_label}?` : `Delete route ${r.origin_label}?`}
                label={es ? "Eliminar" : "Delete"}
              />
            </div>
          </div>
        ))}
        {routes.length === 0 && (
          <p className="rounded-2xl border border-sand-200 bg-white p-10 text-center text-sm text-ink-500">
            {es ? "Sin rutas." : "No routes."}
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">{es ? "Origen" : "Origin"}</th>
              <th className="px-4 py-3">{es ? "Destino" : "Destination"}</th>
              <th className="px-4 py-3 text-right">1–5</th>
              <th className="px-4 py-3 text-right">6+</th>
              <th className="px-4 py-3">{es ? "Acciones" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {routes.map((r) => (
              <tr key={r.id} className="hover:bg-sand-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{r.origin_label}</p>
                  {r.origin_airport && <p className="text-xs text-ink-500">{r.origin_airport}</p>}
                </td>
                <td className="px-4 py-3 text-ink-700">{r.destination}</td>
                <td className="px-4 py-3 text-right font-bold">${r.price_1_5}</td>
                <td className="px-4 py-3 text-right font-bold">${r.price_6_11}</td>
                <td className="px-4 py-3">
                  <span className="flex gap-2">
                    <Link
                      href={`/${locale}/admin/transfers/${r.id}`}
                      className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-200"
                    >
                      {es ? "Editar" : "Edit"}
                    </Link>
                    <DeleteButton
                      locale={locale}
                      id={r.id}
                      action={deleteRoute}
                      confirmMessage={es ? `¿Eliminar la ruta ${r.origin_label}?` : `Delete route ${r.origin_label}?`}
                      label={es ? "Eliminar" : "Delete"}
                    />
                  </span>
                </td>
              </tr>
            ))}
            {routes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                  {es ? "Sin rutas." : "No routes."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
