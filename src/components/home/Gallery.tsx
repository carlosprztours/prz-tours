/**
 * Galería de fotos (rejilla con SafeImage, que deja pasar las de ImageKit).
 */
import Link from "next/link";

import { SafeImage } from "@/components/SafeImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Dictionary } from "@/lib/i18n";
import type { GalleryImage, Locale } from "@/types";

type Props = {
  dict: Dictionary;
  locale: Locale;
  images: GalleryImage[];
  /** Fotos publicadas en total, para poner el número en el botón. */
  total: number;
};

export function Gallery({ dict, locale, images, total }: Props) {
  if (images.length === 0) return null;
  return (
    <section className="py-16 sm:py-20">
      <div className="container-site">
        <SectionHeading title={dict.home.galleryTitle} subtitle={dict.home.gallerySubtitle} />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <figure
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-sand-100"
            >
              <SafeImage
                src={img.url}
                alt={img.alt || img.caption || "Perez Tours"}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              {img.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950/80 to-transparent p-3 pt-8 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
        {/* El botón se muestra siempre, no solo cuando hay más fotos que las de la
            home: la página `/gallery` tiene todas las fotos, su número y el
            pie de foto completo, y sirve aunque ahora mismo coincidan los
            números (p. ej. con 8 fotos y la home enseñando 8). */}
        <div className="mt-10 flex justify-center">
          <Link
            href={`/${locale}/gallery`}
            className="inline-flex h-12 items-center rounded-full bg-ocean-700 px-7 font-display text-base font-bold text-white shadow-lg shadow-ocean-900/15 transition hover:bg-ocean-800"
          >
            {dict.home.gallerySeeAll}
            {total > 0 && (
              <span className="ml-2 text-sm font-semibold opacity-80">
                ({dict.gallery.count(total)})
              </span>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}
