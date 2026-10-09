/**
 * Portada del panel: carrusel hero de la home.
 */
import { notFound } from "next/navigation";

import { requireSection } from "@/lib/admin/access";
import { listAdminHeroSlides } from "@/lib/admin/content";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { AddHeroForm } from "./AddHeroForm";
import { HeroSlideCard } from "./HeroSlideCard";

export default async function AdminPortadaPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "portada");
  const es = locale === "es";

  const slides = await listAdminHeroSlides(locale);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Portada" : "Homepage hero"} · {slides.length}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {es
            ? "Fotos del carrusel principal. Sin slides publicados, la web muestra sus imágenes de respaldo."
            : "Main carousel photos. Without published slides, the site shows its fallback images."}
        </p>
      </div>

      <AddHeroForm locale={locale} es={es} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slides.map((s) => (
          <HeroSlideCard key={s.id} slide={s} locale={locale} es={es} />
        ))}
      </div>
    </div>
  );
}
