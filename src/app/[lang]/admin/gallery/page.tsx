/**
 * Galería del panel: rejilla con eliminar + formulario para agregar.
 */
import Image from "next/image";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteGalleryImage, listAdminGallery } from "@/lib/admin/content";
import { requireSection } from "@/lib/admin/access";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { AddImageForm } from "./AddImageForm";

export default async function AdminGalleryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "gallery");
  const es = locale === "es";

  const images = await listAdminGallery(locale);

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">
        {es ? "Galería" : "Gallery"} · {images.length}
      </h1>

      <AddImageForm locale={locale} es={es} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <figure key={img.id} className="relative aspect-square overflow-hidden rounded-2xl bg-sand-100">
            <Image
              src={img.url}
              alt={img.alt || ""}
              fill
              sizes="25vw"
              className="object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
              <span className="truncate text-xs font-semibold text-white">
                {img.caption || img.url}
              </span>
              <DeleteButton
                locale={locale}
                id={img.id}
                action={deleteGalleryImage}
                confirmMessage={es ? "¿Eliminar esta foto?" : "Delete this photo?"}
                label="✕"
              />
            </div>
            {img.is_published !== 1 && (
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                {es ? "Oculto" : "Hidden"}
              </span>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
