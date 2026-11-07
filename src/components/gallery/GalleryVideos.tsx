/** Vídeos de galería: carátula ligera y carga únicamente al pulsar reproducir. */
"use client";

import { useState } from "react";
import Image from "next/image";
import type { GalleryVideo } from "@/types";

type Props = { videos: GalleryVideo[]; locale: "es" | "en" };

function imageKitPoster(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "ik.imagekit.io" || !/\.(mp4|mov)$/i.test(parsed.pathname)) return undefined;
    // Una imagen comprimida del segundo 2 evita descargar el MP4 para mostrar la carátula.
    return `${parsed.origin}${parsed.pathname}/ik-thumbnail.jpg?tr=so-2,w-800,q-70`;
  } catch { return undefined; }
}

export function VideoPoster({ video, es, sizes, contain = false }: { video: GalleryVideo; es: boolean; sizes: string; contain?: boolean }) {
  const [posterFailed, setPosterFailed] = useState(false);
  const poster = video.poster || imageKitPoster(video.url);
  return (
    <>
      {poster && !posterFailed && <Image src={poster} alt="" fill unoptimized sizes={sizes} className={contain ? "object-contain" : "object-cover"} onError={() => setPosterFailed(true)} />}
      {(!poster || posterFailed) && <span aria-hidden="true" className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/50 to-transparent p-5 text-left text-sm font-semibold tracking-wide">{es ? "Descubre la experiencia Perez Tours" : "Discover the Perez Tours experience"}</span>}
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black/65 text-3xl shadow-lg ring-2 ring-white/80" aria-hidden="true">▶</span>
    </>
  );
}

function stopOnDetach(video: HTMLVideoElement | null) {
  if (video) return () => video.pause();
}

export function VideoCard({ video, es, immersive = false, onPlaybackChange }: {
  video: GalleryVideo;
  es: boolean;
  immersive?: boolean;
  onPlaybackChange?: (active: boolean) => void;
}) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const poster = video.poster || imageKitPoster(video.url);
  return (
    <figure className={immersive ? "flex h-full min-h-0 w-full flex-col text-white" : "overflow-hidden rounded-2xl border border-sand-200 bg-white"}>
      <div className={immersive ? "relative min-h-0 flex-1 bg-slate-900" : "relative aspect-video bg-slate-900"}>
        {started ? (
          <video
            ref={stopOnDetach}
            onLoadStart={() => { setLoading(true); setFailed(false); }}
            onPlaying={() => { setLoading(false); onPlaybackChange?.(true); }}
            onPlay={() => onPlaybackChange?.(true)}
            onPause={() => onPlaybackChange?.(false)}
            onEnded={() => onPlaybackChange?.(false)}
            onWaiting={() => setLoading(true)}
            onError={() => { setLoading(false); setFailed(true); }}
            src={video.url}
            poster={poster}
            controls
            autoPlay
            preload="none"
            playsInline
            className="h-full w-full object-contain"
          >
            {es ? "Tu navegador no admite este vídeo." : "Your browser does not support this video."}
          </video>
        ) : (
          <button
            type="button"
            onClick={() => { setStarted(true); onPlaybackChange?.(true); }}
            aria-label={es ? `Reproducir ${video.title || "vídeo"}` : `Play ${video.title || "video"}`}
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-sky-700 via-cyan-600 to-teal-800 text-white"
          >
            <VideoPoster video={video} es={es} contain={immersive} sizes={immersive ? "100vw" : "(max-width: 640px) 100vw, 33vw"} />
          </button>
        )}
      </div>
      {started && loading && !failed && <p role="status" className={immersive ? "px-4 pt-2 text-sm text-white" : "px-4 pt-3 text-sm text-ink-600"}>{es ? "Preparando el vídeo… En conexiones lentas puede tardar unos segundos." : "Loading video… This can take a moment on slow connections."}</p>}
      {started && failed && <div role="alert" className={immersive ? "px-4 pt-2 text-sm text-white" : "px-4 pt-3 text-sm text-ink-600"}>{es ? "No se pudo cargar el vídeo." : "Could not load the video."} <button type="button" className="font-bold underline" onClick={() => { setStarted(false); setFailed(false); onPlaybackChange?.(false); }}>{es ? "Reintentar" : "Try again"}</button></div>}
      {(video.title || video.caption) && (
        <figcaption className="p-4">
          {video.title && <p className={immersive ? "font-bold" : "font-display font-bold text-ink-900"}>{video.title}</p>}
          {video.caption && <p className={immersive ? "mt-1 text-sm text-white/90" : "mt-1 text-sm text-ink-600"}>{video.caption}</p>}
        </figcaption>
      )}
    </figure>
  );
}

export function GalleryVideos({ videos, locale }: Props) {
  if (videos.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="font-display text-2xl font-extrabold text-ink-900">{locale === "es" ? "Vídeos" : "Videos"}</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => <VideoCard key={video.id} video={video} es={locale === "es"} />)}
      </div>
    </div>
  );
}
