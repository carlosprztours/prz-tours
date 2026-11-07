"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { SafeImage } from "@/components/SafeImage";
import { VideoCard, VideoPoster } from "./GalleryVideos";
import type { GalleryImage, GalleryVideo, Locale } from "@/types";

const INTERVAL = 5000;
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const control = "min-h-11 min-w-11 rounded-full border border-white/40 px-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2";

function subscribe(onChange: () => void) {
  const motion = window.matchMedia(MOTION_QUERY);
  motion.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    motion.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

type Props = {
  images: GalleryImage[];
  videos: GalleryVideo[];
  locale: Locale;
  siteName: string;
};

export function GalleryGrid({ images, videos, locale, siteName }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const es = locale === "es";
  const items = [
    ...images.map((image) => ({ kind: "image" as const, image })),
    ...videos.map((video) => ({ kind: "video" as const, video })),
  ];

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <button
            key={item.kind === "image" ? `image-${item.image.id}` : `video-${item.video.id}`}
            type="button"
            onClick={(event) => { opener.current = event.currentTarget; setIndex(i); }}
            className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-sand-100 text-left text-white focus-visible:outline-2 focus-visible:outline-offset-4"
            aria-haspopup="dialog"
            aria-label={item.kind === "image"
              ? item.image.alt || item.image.caption || (es ? "Ver foto" : "View photo")
              : `${es ? "Abrir vídeo" : "Open video"}${item.video.title ? `: ${item.video.title}` : ""}`}
          >
            {item.kind === "image" ? (
              <>
                <SafeImage src={item.image.url} alt="" fill loading="lazy"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover motion-safe:transition motion-safe:group-hover:scale-105" />
                {item.image.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950/80 to-transparent p-3 pt-8 text-xs font-semibold text-white">{item.image.caption}</span>}
              </>
            ) : <VideoPoster video={item.video} es={es} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" />}
          </button>
        ))}
      </div>
      {index !== null && (
        <GalleryViewer items={items} initialIndex={index} es={es} siteName={siteName}
          opener={opener} onClose={() => setIndex(null)} />
      )}
    </>
  );
}

type MediaItem = { kind: "image"; image: GalleryImage } | { kind: "video"; video: GalleryVideo };

function GalleryViewer({ items, initialIndex, es, siteName, opener, onClose }: {
  items: MediaItem[];
  initialIndex: number;
  es: boolean;
  siteName: string;
  opener: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loadedIndex, setLoadedIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const title = useId();
  const reduceMotion = useSyncExternalStore(subscribe, () => window.matchMedia(MOTION_QUERY).matches, () => true);
  const visible = useSyncExternalStore(subscribe, () => !document.hidden, () => false);
  const count = items.length;
  const rotating = count > 1 && !paused && !playing && !interacting && !focused && !reduceMotion && visible;
  const item = items[index];
  const next = items[(index + 1) % count];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = opener.current;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      root.style.overflow = overflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [opener]);

  useEffect(() => {
    if (!rotating) return;
    const timeout = window.setTimeout(() => setIndex((index + 1) % count), INTERVAL);
    return () => window.clearTimeout(timeout);
  }, [count, index, rotating]);

  function move(direction: number) {
    setPlaying(false);
    setIndex((current) => (current + direction + count) % count);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLVideoElement || count < 2) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onFocusCapture={(event) => setFocused((event.target as Element) !== closeButton.current && event.target.matches(":focus-visible"))}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden overscroll-contain bg-ocean-950 text-white"
    >
      <div className="flex h-full flex-col gap-3 p-3 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={title} className="font-bold">{es ? "Galería multimedia" : "Media gallery"}</h2>
          <button ref={closeButton} type="button" className={control} onClick={onClose}>{es ? "Cerrar" : "Close"} ✕</button>
        </header>
        <div
          className="relative min-h-0 flex-1 touch-pan-y"
          onTouchStart={(event) => {
            setInteracting(true);
            const first = event.touches[0];
            touch.current = event.touches.length === 1 && !(event.target instanceof HTMLVideoElement)
              ? { x: first.clientX, y: first.clientY } : null;
          }}
          onTouchEnd={(event) => {
            setInteracting(false);
            const start = touch.current;
            touch.current = null;
            if (!start || count < 2 || event.touches.length) return;
            const end = event.changedTouches[0];
            const dx = end.clientX - start.x;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(end.clientY - start.y)) move(dx < 0 ? 1 : -1);
          }}
          onTouchCancel={() => { touch.current = null; setInteracting(false); }}
          onMouseDown={() => setInteracting(true)}
          onMouseUp={() => setInteracting(false)}
          onMouseLeave={() => setInteracting(false)}
        >
          {item.kind === "image" ? (
            <SafeImage key={index} src={item.image.url} alt={item.image.alt || item.image.caption || siteName}
              fill sizes="100vw" loading="eager" className={rotating ? "object-contain gallery-photo-rotation" : "object-contain"} onLoad={() => setLoadedIndex(index)} />
          ) : (
            <VideoCard key={index} video={item.video} es={es} immersive onPlaybackChange={setPlaying} />
          )}
          {count > 1 && item.kind === "image" && loadedIndex === index && next.kind === "image" && (
            <div aria-hidden="true" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
              <SafeImage src={next.image.url} alt="" fill sizes="100vw" loading="eager" fetchPriority="low" />
            </div>
          )}
        </div>
        {item.kind === "image" && item.image.caption && <p className="max-h-[15dvh] overflow-y-auto text-center text-sm">{item.image.caption}</p>}
        <footer className="flex flex-wrap items-center justify-center gap-2">
          {count > 1 && <button type="button" className={control} onClick={() => move(-1)} aria-label={es ? "Anterior" : "Previous"}>‹</button>}
          <p aria-live={paused || reduceMotion ? "polite" : "off"} className="min-w-12 text-center text-sm">{index + 1} / {count}</p>
          {count > 1 && <button type="button" className={control} onClick={() => move(1)} aria-label={es ? "Siguiente" : "Next"}>›</button>}
          {count > 1 && !reduceMotion && <button type="button" className={control} onClick={() => setPaused(!paused)}>
            {paused ? (es ? "Reanudar carrusel" : "Resume slideshow") : (es ? "Pausar carrusel" : "Pause slideshow")}
          </button>}
        </footer>
      </div>
    </dialog>
  );
}
