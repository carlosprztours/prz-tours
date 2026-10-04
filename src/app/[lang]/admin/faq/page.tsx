/**
 * Índice de preguntas frecuentes del panel.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteFaq, listAdminFaqs } from "@/lib/admin/faqs";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

export default async function AdminFaqPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  const items = await listAdminFaqs(locale);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          FAQ · {items.length}
        </h1>
        <Link
          href={`/${locale}/admin/faq/new`}
          className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "+ Nueva" : "+ New"}
        </Link>
      </div>

      <ul className="grid gap-3">
        {items.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{locale === "es" ? f.question_es : f.question_en || f.question_es}</p>
              {!f.is_published && (
                <p className="mt-0.5 text-xs font-bold text-slate-500">{es ? "Oculta" : "Hidden"}</p>
              )}
            </div>
            <span className="flex gap-2">
              <Link
                href={`/${locale}/admin/faq/${f.id}`}
                className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-200"
              >
                {es ? "Editar" : "Edit"}
              </Link>
              <DeleteButton
                locale={locale}
                id={f.id}
                action={deleteFaq}
                confirmMessage={es ? "¿Eliminar esta pregunta?" : "Delete this question?"}
                label={es ? "Eliminar" : "Delete"}
              />
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-sand-200 bg-white p-10 text-center text-sm text-ink-500">
            {es ? "Sin preguntas." : "No questions."}
          </li>
        )}
      </ul>
    </div>
  );
}
