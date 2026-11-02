/** Vídeos de galería: carátula ligera y carga únicamente al pulsar reproducir. */
"use client";

import { useState } from "react";
import Image from "next/image";
import type { GalleryVideo } from "@/types";

type Props = { videos: GalleryVideo[] };

function imageKitPoster(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "ik.imagekit.io" || !/\.(mp4|mov)$/i.test(parsed.pathname)) return undefined;
    // Una imagen comprimida del segundo 2 evita descargar el MP4 para mostrar la carátula.
    return `${parsed.origin}${parsed.pathname}/ik-thumbnail.jpg?tr=so-2,w-800,q-70`;
  } catch { return undefined; }
}

function VideoCard({ video }: { video: GalleryVideo }) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const poster = video.poster || imageKitPoster(video.url);
  return (
    <figure className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <div className="relative aspect-video bg-slate-900">
        {started ? (
          <video
            onLoadStart={() => { setLoading(true); setFailed(false); }}
            onPlaying={() => setLoading(false)}
            onWaiting={() => setLoading(true)}
            onError={() => { setLoading(false); setFailed(true); }}
            src={video.url}
            poster={poster}
            controls
            autoPlay
            preload="none"
            playsInline
            className="h-full w-full"
          >
            Tu navegador no admite este vídeo.
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setStarted(true)}
            aria-label={`Reproducir ${video.title || "vídeo"}`}
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-900 text-white"
          >
            {poster && <Image src={poster} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />}
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black/65 text-3xl shadow-lg ring-2 ring-white/80" aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      {started && loading && !failed && <p role="status" className="px-4 pt-3 text-sm text-ink-600">Preparando el vídeo… En conexiones lentas puede tardar unos segundos.</p>}
      {started && failed && <div role="alert" className="px-4 pt-3 text-sm text-ink-600">No se pudo cargar el vídeo. <button type="button" className="font-bold underline" onClick={() => { setStarted(false); setFailed(false); }}>Reintentar</button></div>}
      {(video.title || video.caption) && (
        <figcaption className="p-4">
          {video.title && <p className="font-display font-bold text-ink-900">{video.title}</p>}
          {video.caption && <p className="mt-1 text-sm text-ink-600">{video.caption}</p>}
        </figcaption>
      )}
    </figure>
  );
}

export function GalleryVideos({ videos }: Props) {
  if (videos.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="font-display text-2xl font-extrabold text-ink-900">Vídeos</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => <VideoCard key={video.id} video={video} />)}
      </div>
    </div>
  );
}
