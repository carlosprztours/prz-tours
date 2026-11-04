"use client";

import { useMemo, useState } from "react";
import type { GalleryImage } from "@/types";
import { GalleryImageCard } from "./GalleryImageCard";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteGalleryImage } from "@/lib/admin/content";

export function GalleryImageBrowser({ images, locale, es }: { images: GalleryImage[]; locale: string; es: boolean }) {
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => images.filter((image) => {
    const matches = [image.alt, image.caption, image.url].some((v) => (v ?? "").toLowerCase().includes(term.trim().toLowerCase()));
    return matches && (status === "all" || (status === "published" ? image.is_published === 1 : image.is_published !== 1));
  }), [images, term, status]);
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <input type="search" aria-label={es ? "Buscar fotografías" : "Search photos"} placeholder={es ? "Buscar excursión, descripción o nombre…" : "Search excursion, caption or name…"} value={term} onChange={(e) => setTerm(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-sand-200 bg-white px-3 text-sm" />
        <select aria-label={es ? "Filtrar publicación" : "Filter publication"} value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-sand-200 bg-white px-3 text-sm">
          <option value="all">{es ? "Todas" : "All"}</option>
          <option value="published">{es ? "Publicadas" : "Published"}</option>
          <option value="hidden">{es ? "Ocultas" : "Hidden"}</option>
        </select>
      </div>
      <p className="text-xs text-ink-500" aria-live="polite">{filtered.length} / {images.length} {es ? "fotografías" : "photos"}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((img) => (
          <div key={img.id} className="relative">
            <GalleryImageCard image={img} locale={locale} es={es} />
            <div className="absolute right-2 top-2">
              <DeleteButton locale={locale} id={img.id} action={deleteGalleryImage} confirmMessage={es ? "¿Eliminar esta foto?" : "Delete this photo?"} label="✕" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
