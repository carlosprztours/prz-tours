/**
 * Índice de artículos del panel.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteArticle, listAdminArticles } from "@/lib/admin/articles";
import { requireSection } from "@/lib/admin/access";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

export default async function AdminBlogPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "blog");
  const es = locale === "es";

  const items = await listAdminArticles(locale);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          Blog · {items.length}
        </h1>
        <Link
          href={`/${locale}/admin/blog/new`}
          className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "+ Nuevo" : "+ New"}
        </Link>
      </div>

      <ul className="grid gap-3">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-4"
          >
            <div>
              <p className="font-semibold text-ink-900">{a.title_es || a.title_en || a.slug}</p>
              <p className="text-xs text-ink-500">/{a.slug}</p>
            </div>
            <span className="flex items-center gap-2">
              {!a.is_published && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {es ? "Oculto" : "Hidden"}
                </span>
              )}
              <Link
                href={`/${locale}/admin/blog/${a.id}`}
                className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-200"
              >
                {es ? "Editar" : "Edit"}
              </Link>
              <DeleteButton
                locale={locale}
                id={a.id}
                action={deleteArticle}
                confirmMessage={es ? `¿Eliminar "${a.title_es || a.slug}"?` : `Delete "${a.title_en || a.slug}"?`}
                label={es ? "Eliminar" : "Delete"}
              />
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-sand-200 bg-white p-10 text-center text-sm text-ink-500">
            {es ? "Sin artículos." : "No articles."}
          </li>
        )}
      </ul>
    </div>
  );
}
