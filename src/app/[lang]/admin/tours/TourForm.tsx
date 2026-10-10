/**
 * Formulario de crear/editar tour (componente de cliente).
 *
 * Un solo formulario con todo: datos base, textos ES/EN (pestañas simples),
 * imágenes ("url | alt", una por línea) y listas (un ítem por línea).
 * El servidor normaliza y guarda en las cuatro tablas.
 */
"use client";

import { useActionState, useMemo, useState } from "react";

import { UploadButton } from "@/components/admin/UploadButton";
import { MediaPicker } from "@/components/media/MediaPicker";
import {
  createTour,
  updateTour,
  type AdminTourFull,
  type ToursResult,
} from "@/lib/admin/tours";
import type { Locale } from "@/types";

type Labels = {
  base: string;
  slug: string;
  price: string;
  priceUnit: string;
  unitPerson: string;
  unitVehicle: string;
  unitGroup: string;
  duration: string;
  category: string;
  difficulty: string;
  easy: string;
  moderate: string;
  challenging: string;
  ageMin: string;
  maxGroup: string;
  deposit: string;
  pickupNote: string;
  featured: string;
  published: string;
  order: string;
  texts: string;
  title: string;
  summary: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  images: string;
  imagesHint: string;
  lists: string;
  included: string;
  excluded: string;
  bring: string;
  save: string;
  saving: string;
  saved: string;
  errors: Record<string, string>;
};

type Props = {
  locale: Locale;
  initial: AdminTourFull | null;
  labels: Labels;
  /** Categorías activas de `tour_categories` (creables desde el panel). */
  categories: { slug: string; label: string; icon: string }[];
  /** Texto del botón para gestionar categorías (enlaza al gestor). */
  manageCategories: string;
};

const initialState: ToursResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const areaClass =
  "w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";

/**
 * Galería de imágenes del tour: muestra todas las fotos del textarea con
 * miniaturas, clic para ver en grande y eliminar individualmente.
 */
function ImageGallery({
  images,
  es,
  onChange,
}: {
  images: { url: string; alt: string }[];
  es: boolean;
  onChange: (images: { url: string; alt: string }[]) => void;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {images.map((img, i) => (
        <div key={i} className="group relative">
          <button
            type="button"
            onClick={() => setLightbox(i)}
            className="block w-full overflow-hidden rounded-xl border border-sand-200 bg-sand-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt || `Foto ${i + 1}`}
              className="aspect-square w-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
          </button>
          <button
            type="button"
            onClick={() => onChange(images.filter((_, j) => j !== i))}
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow transition hover:bg-red-700"
            title={es ? "Eliminar foto" : "Remove photo"}
          >
            ✕
          </button>
        </div>
      ))}

      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox].url}
            alt={images[lightbox].alt || `Foto ${lightbox + 1}`}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white backdrop-blur transition hover:bg-white/30"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export function TourForm({ locale, initial, labels, categories, manageCategories }: Props) {
  const [tab, setTab] = useState<"es" | "en">("es");
  const action = useMemo(
    () =>
      initial
        ? updateTour.bind(null, locale, initial.tour.id)
        : createTour.bind(null, locale),
    [locale, initial],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const [images, setImages] = useState<{ url: string; alt: string }[]>(
    () => (initial?.images ?? []).map((i) => ({ url: i.url, alt: i.alt }))
  );
  const t = initial?.tour;

  const tr = (loc: "es" | "en") => initial?.translations[loc];

  return (
    <form action={formAction} className="grid gap-5">
      {/* ── Base ── */}
      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="font-display text-lg font-bold text-ink-900">{labels.base}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className={`${labelClass} sm:col-span-2`}>
            {labels.slug}
            <input name="slug" required defaultValue={t?.slug ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            {labels.order}
            <input name="sort_order" type="number" defaultValue={t?.sort_order ?? 0} className={inputClass} />
          </label>
          <label className={labelClass}>
            {labels.price}
            <input name="price" type="number" min={0} step={0.01} required defaultValue={t?.price ?? 60} className={inputClass} />
          </label>
          <label className={labelClass}>
            {labels.priceUnit}
            <select name="price_unit" defaultValue={t?.price_unit ?? "person"} className={inputClass}>
              <option value="person">{labels.unitPerson}</option>
              <option value="vehicle">{labels.unitVehicle}</option>
              <option value="group">{labels.unitGroup}</option>
            </select>
          </label>
          <label className={labelClass}>
            {labels.duration}
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const cur = Number((document.getElementById("duration_minutes") as HTMLInputElement)?.value) || 240;
                  (document.getElementById("duration_minutes") as HTMLInputElement).value = String(Math.max(30, cur - 30));
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-sand-200 bg-white text-lg font-bold text-ink-700 transition hover:border-ocean-300"
                aria-label="-30 min"
              >
                −
              </button>
              <input name="duration_minutes" id="duration_minutes" type="number" min={30} step={30} required defaultValue={t?.duration_minutes ?? 240} className={`${inputClass} text-center`} />
              <button
                type="button"
                onClick={() => {
                  const cur = Number((document.getElementById("duration_minutes") as HTMLInputElement)?.value) || 240;
                  (document.getElementById("duration_minutes") as HTMLInputElement).value = String(cur + 30);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-sand-200 bg-white text-lg font-bold text-ink-700 transition hover:border-ocean-300"
                aria-label="+30 min"
              >
                +
              </button>
            </span>
          </label>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">
              {labels.category}
              <a
                href={`/${locale}/admin/tours/categories`}
                className="font-bold text-ocean-600 underline hover:text-ocean-800"
              >
                {manageCategories}
              </a>
            </span>
            <select name="category" defaultValue={t?.category ?? categories[0]?.slug ?? "other"} className={inputClass}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            {labels.difficulty}
            <select name="difficulty" defaultValue={t?.difficulty ?? "easy"} className={inputClass}>
              <option value="easy">{labels.easy}</option>
              <option value="moderate">{labels.moderate}</option>
              <option value="challenging">{labels.challenging}</option>
            </select>
          </label>
          <label className={labelClass}>
            {labels.ageMin}
            <input name="age_min" type="number" min={0} defaultValue={t?.age_min ?? ""} placeholder="—" className={inputClass} />
          </label>
          <label className={labelClass}>
            {labels.maxGroup}
            <input name="max_group" type="number" min={1} defaultValue={t?.max_group ?? 20} className={inputClass} />
          </label>
          <label className={labelClass}>
            {labels.deposit}
            <input name="deposit_percent" type="number" min={0} max={100} defaultValue={t?.deposit_percent ?? 0} className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-3`}>
            {labels.pickupNote}
            <input name="pickup_note" defaultValue={t?.pickup_note ?? ""} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <input type="checkbox" name="is_featured" defaultChecked={(t?.is_featured ?? 0) === 1} className="h-4 w-4" />
            {labels.featured}
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <input type="checkbox" name="is_published" defaultChecked={(t?.is_published ?? 1) === 1} className="h-4 w-4" />
            {labels.published}
          </label>
        </div>
      </section>

      {/* ── Textos ES/EN ── */}
      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">{labels.texts}</h2>
          <div className="flex gap-1 rounded-full bg-sand-100 p-1">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setTab(l)}
                className={`rounded-full px-4 py-1 text-sm font-bold transition ${tab === l ? "bg-white shadow" : "text-ink-500"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {(["es", "en"] as const).map((l) => (
          <div key={l} className={`mt-4 grid gap-3 ${tab === l ? "" : "hidden"}`}>
            <label className={labelClass}>
              {labels.title} <span className="whitespace-nowrap">({l.toUpperCase()})</span>
              <input name={`title_${l}`} defaultValue={tr(l)?.title ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              {labels.summary} <span className="whitespace-nowrap">({l.toUpperCase()})</span>
              <input name={`summary_${l}`} defaultValue={tr(l)?.summary ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              {labels.description} <span className="whitespace-nowrap">({l.toUpperCase()})</span>
              <textarea name={`description_${l}`} rows={8} defaultValue={tr(l)?.description ?? ""} className={areaClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {labels.seoTitle}
                <input name={`seo_title_${l}`} defaultValue={tr(l)?.seo_title ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                {labels.seoDescription}
                <input name={`seo_description_${l}`} defaultValue={tr(l)?.seo_description ?? ""} className={inputClass} />
              </label>
            </div>
          </div>
        ))}
      </section>

      {/* ── Imágenes y listas ── */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-sand-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink-900">{labels.images}</h2>
            <UploadButton
              targetId="tour-images"
              folder="tours"
              multiple
              labels={
                locale === "es"
                  ? {
                      upload: "Subir fotos",
                      uploading: "Subiendo…",
                      failed: "No se pudo subir.",
                      reasons: {
                        notConfigured: "Falta configurar ImageKit.",
                        badType: "Formato no válido (JPG, PNG, WebP, AVIF o GIF).",
                        badSize: "Alguna foto supera los 30 MB.",
                        tooMany: "Máximo 20 fotos de golpe.",
                      },
                    }
                  : {
                      upload: "Upload photos",
                      uploading: "Uploading…",
                      failed: "Upload failed.",
                      reasons: {
                        notConfigured: "ImageKit is not configured.",
                        badType: "Unsupported format (JPG, PNG, WebP, AVIF or GIF).",
                        badSize: "One of the photos is larger than 30 MB.",
                        tooMany: "Up to 20 photos at a time.",
                      },
                    }
              }
            />
            <MediaPicker
              kind="image"
              folder="tours"
              label={locale === "es" ? "Elegir de ImageKit" : "Pick from ImageKit"}
              onPick={(urls) => {
                const target = document.getElementById("tour-images") as HTMLTextAreaElement | null;
                if (!target) return;
                const lineas = urls.map((u) => `${u} | ${u.split("/").pop() ?? u}`);
                const actual = target.value.trim();
                target.value = actual ? `${actual}\n${lineas.join("\n")}` : lineas.join("\n");
                target.dispatchEvent(new Event("change", { bubbles: true }));
              }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-500">{labels.imagesHint}</p>
          <ImageGallery images={images} es={locale === "es"} onChange={setImages} />
          <textarea
            id="tour-images"
            name="images"
            rows={6}
            value={images.map((i) => `${i.url} | ${i.alt}`).join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n").filter((l) => l.trim());
              setImages(lines.map((line) => {
                const [url, ...altParts] = line.split("|");
                return { url: (url ?? "").trim(), alt: altParts.join("|").trim() };
              }));
            }}
            className={`${areaClass} mt-3 font-mono`}
          />
        </div>
        <div className="rounded-2xl border border-sand-200 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink-900">{labels.lists}</h2>
          {(["included", "excluded", "bring"] as const).map((section) => (
            <div key={section} className="mt-3 grid gap-2 sm:grid-cols-2">
              {(["es", "en"] as const).map((l) => (
                <label key={l} className={labelClass}>
                  {section === "included" ? labels.included : section === "excluded" ? labels.excluded : labels.bring} <span className="whitespace-nowrap">({l.toUpperCase()})</span>
                  <textarea
                    name={`${section}_${l}`}
                    rows={4}
                    defaultValue={(initial?.lists[l][section] ?? []).join("\n")}
                    className={areaClass}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
      </section>

      {!state.ok && state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {labels.errors[state.error] ?? state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
          {labels.saved}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 justify-self-start rounded-full bg-ocean-700 px-8 font-display text-base font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
      >
        {pending ? labels.saving : labels.save}
      </button>
    </form>
  );
}
