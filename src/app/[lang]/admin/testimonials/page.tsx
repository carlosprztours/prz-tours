/**
 * Índice de testimonios del panel.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { Stars } from "@/components/ui/Stars";
import { deleteTestimonial, listAdminTestimonials } from "@/lib/admin/content";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

export default async function AdminTestimonialsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  const items = await listAdminTestimonials(locale);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Opiniones" : "Reviews"} · {items.length}
        </h1>
        <Link
          href={`/${locale}/admin/testimonials/new`}
          className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "+ Nueva" : "+ New"}
        </Link>
      </div>

      <ul className="grid gap-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-sand-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold text-ink-900">
                  {item.author_name}
                  {item.author_origin ? ` · ${item.author_origin}` : ""}
                </p>
                <Stars rating={item.rating} />
              </div>
              <span className="flex gap-2">
                <Link
                  href={`/${locale}/admin/testimonials/${item.id}`}
                  className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-200"
                >
                  {es ? "Editar" : "Edit"}
                </Link>
                <DeleteButton
                  locale={locale}
                  id={item.id}
                  action={deleteTestimonial}
                  confirmMessage={es ? `¿Eliminar la opinión de ${item.author_name}?` : `Delete review by ${item.author_name}?`}
                  label={es ? "Eliminar" : "Delete"}
                />
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-700">
              {(locale === "es" ? item.text_es : item.text_en) || item.text_es}
            </p>
            {!item.is_published && (
              <p className="mt-1 text-xs font-bold text-slate-500">
                {es ? "Oculto" : "Hidden"}
              </p>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-sand-200 bg-white p-10 text-center text-sm text-ink-500">
            {es ? "Sin opiniones." : "No reviews."}
          </li>
        )}
      </ul>
    </div>
  );
}
