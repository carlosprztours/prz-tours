/**
 * Índice de tours del panel: tabla + crear + eliminar.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteTour, listAdminTours } from "@/lib/admin/tours";
import { requireSection } from "@/lib/admin/access";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { DeleteButton } from "@/components/admin/DeleteButton";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AdminToursPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "tours");

  const tours = await listAdminTours(locale);
  const es = locale === "es";

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          Tours · {tours.length}
        </h1>
        <Link
          href={`/${locale}/admin/tours/new`}
          className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "+ Nuevo tour" : "+ New tour"}
        </Link>
      </div>

      <div className="grid gap-3 md:hidden">
        {tours.map((tour) => (
          <div key={tour.id} className="rounded-2xl border border-sand-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink-900">
                {tour.title_es || tour.title_en || tour.slug}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  tour.is_published === 1
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tour.is_published === 1 ? (es ? "Publicado" : "Published") : es ? "Oculto" : "Hidden"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              /{tour.slug}
              {tour.is_featured === 1 ? " · ★" : ""}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-display text-xl font-extrabold text-ink-900">
                ${tour.price}
              </span>
              <span className="flex gap-2">
                <Link
                  href={`/${locale}/admin/tours/${tour.id}`}
                  className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800"
                >
                  {es ? "Editar" : "Edit"}
                </Link>
                <DeleteButton
                  locale={locale}
                  id={tour.id}
                  action={deleteTour}
                  confirmMessage={
                    es
                      ? `¿Eliminar "${tour.title_es || tour.slug}" y todo su contenido?`
                      : `Delete "${tour.title_en || tour.slug}" and all its content?`
                  }
                  label={es ? "Eliminar" : "Delete"}
                />
              </span>
            </div>
          </div>
        ))}
        {tours.length === 0 && (
          <p className="rounded-2xl border border-sand-200 bg-white p-10 text-center text-sm text-ink-500">
            {es ? "Sin tours." : "No tours."}
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">Tour</th>
              <th className="px-4 py-3 text-right">{es ? "Precio" : "Price"}</th>
              <th className="px-4 py-3">{es ? "Estado" : "Status"}</th>
              <th className="px-4 py-3">{es ? "Acciones" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {tours.map((tour) => (
              <tr key={tour.id} className="hover:bg-sand-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">
                    {tour.title_es || tour.title_en || tour.slug}
                  </p>
                  <p className="text-xs text-ink-500">
                    /{tour.slug}
                    {tour.is_featured === 1 ? " · ★" : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-display font-extrabold">
                  ${tour.price}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      tour.is_published === 1
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tour.is_published === 1
                      ? es
                        ? "Publicado"
                        : "Published"
                      : es
                        ? "Oculto"
                        : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex gap-2">
                    <Link
                      href={`/${locale}/admin/tours/${tour.id}`}
                      className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-200"
                    >
                      {es ? "Editar" : "Edit"}
                    </Link>
                    <DeleteButton
                      locale={locale}
                      id={tour.id}
                      action={deleteTour}
                      confirmMessage={
                        es
                          ? `¿Eliminar "${tour.title_es || tour.slug}" y todo su contenido?`
                          : `Delete "${tour.title_en || tour.slug}" and all its content?`
                      }
                      label={es ? "Eliminar" : "Delete"}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
