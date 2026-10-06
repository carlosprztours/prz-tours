/**
 * Vídeos de la sección de galería.
 *
 * Los vídeos **no se reproducen solos**: cargan la primera foto (poster o
 * metadatos) y esperan a que el usuario pulse play. A propósito en un servidor
 * puro, sin estado.
 */
import type { GalleryVideo } from "@/types";

type Props = {
  videos: GalleryVideo[];
};

export function GalleryVideos({ videos }: Props) {
  if (videos.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="font-display text-2xl font-extrabold text-ink-900">Vídeos</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <figure key={v.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <div className="aspect-video bg-black">
              <video
                src={v.url}
                poster={v.poster ?? undefined}
                controls
                preload="metadata"
                playsInline
                className="h-full w-full"
              />
            </div>
            {(v.title || v.caption) && (
              <figcaption className="p-4">
                {v.title && <p className="font-display font-bold text-ink-900">{v.title}</p>}
                {v.caption && <p className="mt-1 text-sm text-ink-600">{v.caption}</p>}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
