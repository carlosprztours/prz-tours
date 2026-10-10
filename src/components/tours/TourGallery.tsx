/**
 * Galería del detalle de tour: imagen principal + miniaturas.
 *
 * Sin JavaScript: rejilla simple y rápida. (Un lightbox quedaría para una
 * mejora futura; la prioridad es que cargue rápido en móviles de turistas.)
 */
import { SafeImage } from "@/components/SafeImage";
import type { TourImage } from "@/types";

export function TourGallery({
  images,
  title,
}: {
  images: TourImage[];
  title: string;
}) {
  if (images.length === 0) return null;
  const [cover, ...rest] = images;

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-sand-100">
        <SafeImage
          src={cover.url}
          alt={cover.alt || title}
          fill
          priority
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover"
        />
      </div>
      {rest.length > 0 && (
        <div className={`grid gap-3 ${rest.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
          {rest.map((img) => (
            <div key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand-100">
              <SafeImage
                src={img.url}
                alt={img.alt || title}
                fill
                sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
