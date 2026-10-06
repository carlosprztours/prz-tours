/**
 * Gestor de categorías de tour: crear (con traducción ES→EN automática),
 * activar/desactivar y eliminar.
 */
import { notFound } from "next/navigation";

import { requireSection } from "@/lib/admin/access";
import { listTourCategories } from "@/lib/admin/categories";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import Link from "next/link";
import { CategoryForm } from "./CategoryForm";
import { CategoryRowActions } from "./CategoryRowActions";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function TourCategoriesPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "tours");
  const es = locale === "es";

  const rows = await listTourCategories(locale);

  const t = {
    back: es ? "← Tours" : "← Tours",
    title: es ? "Categorías de tour" : "Tour categories",
    hint: es
      ? "Crea las categorías que necesites. Si no escribes el nombre en inglés, se traduce automáticamente al guardar. Desactivar oculta la categoría sin tocar los tours que la usan."
      : "Create the categories you need. If you leave the English name empty it is translated automatically on save. Deactivating hides it without touching the tours that use it.",
    slug: es ? "Slug (opcional)" : "Slug (optional)",
    slugHint: es ? "Si lo dejas vacío se genera del nombre." : "Leave empty to generate from the name.",
    name: es ? "Nombre" : "Name",
    nameEn: es ? "Nombre en inglés (opcional)" : "English name (optional)",
    icon: es ? "Icono (emoji)" : "Icon (emoji)",
    submit: es ? "Crear categoría" : "Create category",
    listTitle: es ? "Categorías existentes" : "Existing categories",
    active: es ? "Activa" : "Active",
    inactive: es ? "Inactiva" : "Inactive",
    activate: es ? "Activar" : "Activate",
    deactivate: es ? "Desactivar" : "Deactivate",
    remove: es ? "Eliminar" : "Delete",
    confirmRemove: es
      ? "¿Eliminar esta categoría? Los tours que la usen pasarán a «Otros»."
      : "Delete this category? Tours using it will move to “Other”.",
    failed: es ? "No se pudo aplicar" : "Could not apply",
    inUse: es ? "en uso" : "in use",
    errors: es
      ? {
          "bad-label": "Escribe un nombre de al menos 2 caracteres.",
          "bad-slug": "El slug no es válido.",
          "slug-taken": "Ya existe una categoría con ese slug.",
          "translation-failed":
            "Guardada, pero NO se pudo traducir el nombre al inglés: el servicio de traducción tiene el cupo diario agotado. Escribe el nombre en inglés a mano y se verá en la versión inglesa de la web.",
        }
      : {
          "bad-label": "Enter a name of at least 2 characters.",
          "bad-slug": "That slug is not valid.",
          "slug-taken": "A category with that slug already exists.",
          "translation-failed":
            "Saved, but the English name could not be translated: the translation service has run out of its daily quota. Type the English name by hand and it will show in the English version of the site.",
        },
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/${locale}/admin/tours`} className="text-sm font-bold text-ocean-700 hover:underline">
          {t.back}
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{t.title}</h1>
      </div>

      <p className="max-w-2xl text-sm text-ink-500">{t.hint}</p>

      <CategoryForm locale={locale} labels={t} />

      <section className="grid gap-3">
        <h2 className="font-display text-lg font-bold text-ink-900">{t.listTitle}</h2>
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3"
            >
              <span className="text-2xl" aria-hidden>
                {r.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink-900">
                  {es ? r.label_es : r.label_en || r.label_es}
                </span>
                <span className="block truncate text-xs text-ink-500">
                  /{r.slug}
                  {r.is_active === 1 ? "" : ` · ${t.inactive}`}
                </span>
              </span>
              <CategoryRowActions
                locale={locale}
                id={r.id}
                active={r.is_active === 1}
                labels={{
                  activate: t.activate,
                  deactivate: t.deactivate,
                  remove: t.remove,
                  confirmRemove: t.confirmRemove,
                  failed: t.failed,
                }}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}