/**
 * Galería del panel: alta de varias fotos de golpe y ficha editable de cada una.
 *
 * Cada foto trae su formulario (texto alternativo, leyenda, orden y si está
 * publicada) para poder corregirla sin borrarla y volver a subirla.
 */
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { requireSection } from "@/lib/admin/access";
import {
  deleteGalleryImage,
  deleteGalleryVideo,
  listAdminGallery,
  listAdminGalleryVideos,
  listTourSlugsForPicker,
} from "@/lib/admin/content";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { AddImageForm } from "./AddImageForm";
import { AddVideoForm } from "./AddVideoForm";
import { GalleryImageCard } from "./GalleryImageCard";
import { VideoCard } from "./VideoCard";

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
  const videos = await listAdminGalleryVideos(locale);
  const tours = await listTourSlugsForPicker(locale);
  const sinAlt = images.filter((i) => !i.alt?.trim()).length;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Galería" : "Gallery"} · {images.length}
        </h1>
        {sinAlt > 0 && (
          <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {es
              ? `${sinAlt} foto(s) sin texto alternativo. Quien use un lector de pantalla no sabrá qué muestran: escríbelo en su ficha.`
              : `${sinAlt} photo(s) have no alt text. A screen-reader user won't know what they show: write it on the photo's card.`}
          </p>
        )}
      </div>

      <AddImageForm locale={locale} es={es} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="relative">
            <GalleryImageCard image={img} locale={locale} es={es} />
            <div className="absolute right-2 top-2">
              <DeleteButton
                locale={locale}
                id={img.id}
                action={deleteGalleryImage}
                confirmMessage={es ? "¿Eliminar esta foto?" : "Delete this photo?"}
                label="✕"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Vídeos ── */}
      <h2 className="mt-4 font-display text-xl font-extrabold text-ink-900">
        {es ? "Vídeos" : "Videos"} · {videos.length}
      </h2>
      <AddVideoForm locale={locale} es={es} tours={tours} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <div key={v.id} className="relative">
            <VideoCard video={v} locale={locale} es={es} tours={tours} />
            <div className="absolute right-2 top-2">
              <DeleteButton
                locale={locale}
                id={v.id}
                action={deleteGalleryVideo}
                confirmMessage={es ? "¿Eliminar este vídeo?" : "Delete this video?"}
                label="✕"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}