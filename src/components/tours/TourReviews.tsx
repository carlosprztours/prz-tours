/**
 * Formulario público para dejar una opinión (componente de cliente).
 *
 * La opinión queda pendiente de moderación: el equipo la publica desde el
 * panel. Incluye honeypot anti-spam invisible.
 */
"use client";

import { useActionState, useMemo, useState } from "react";

import { submitReview, type ReviewResult } from "@/lib/actions/reviews";
import { Stars } from "@/components/ui/Stars";
import type { Locale, Testimonial } from "@/types";

const initialState: ReviewResult = { ok: false, error: "" };

const inputClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export type ReviewLabels = {
  title: string;
  formTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  ratingLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  errorBody: string;
};

export function TourReviews({
  locale,
  tourSlug,
  reviews,
  labels,
}: {
  locale: Locale;
  tourSlug: string;
  reviews: Testimonial[];
  labels: ReviewLabels;
}) {
  const action = useMemo(() => submitReview.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [rating, setRating] = useState(5);

  return (
    <section className="mt-16">
      <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
        {labels.title}
      </h2>

      {reviews.length > 0 && (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {reviews.map((t) => (
            <figure key={t.id} className="flex flex-col rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
              <Stars rating={t.rating} />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
                “{locale === "es" ? t.text_es || t.text_en : t.text_en || t.text_es}”
              </blockquote>
              <figcaption className="mt-4 border-t border-sand-100 pt-3">
                <p className="font-display text-sm font-bold text-ink-900">{t.author_name}</p>
                {t.author_origin && <p className="text-xs text-ink-500">{t.author_origin}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-sand-200 bg-white p-6 sm:p-8">
        {state.ok ? (
          <div className="text-center">
            <p className="font-display text-xl font-extrabold text-ink-900">{labels.successTitle}</p>
            <p className="mt-2 text-sm text-ink-600">{labels.successBody}</p>
          </div>
        ) : (
          <form action={formAction} className="grid gap-4">
            <h3 className="font-display text-lg font-extrabold text-ink-900">{labels.formTitle}</h3>
            <input type="hidden" name="tourSlug" value={tourSlug} />
            <input type="hidden" name="rating" value={rating} />
            {/* Honeypot anti-spam: invisible para humanos. */}
            <input
              type="text"
              name="honeypot"
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
            />
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label htmlFor="review-name" className="mb-1.5 block text-sm font-bold text-ink-900">
                  {labels.nameLabel}
                </label>
                <input
                  id="review-name"
                  name="authorName"
                  type="text"
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder={labels.namePlaceholder}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-bold text-ink-900">{labels.ratingLabel}</span>
                <span className="flex gap-1" role="radiogroup" aria-label={labels.ratingLabel}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n}/5`}
                      onClick={() => setRating(n)}
                      className="rounded transition hover:scale-110"
                    >
                      <Stars rating={n <= rating ? 1 : 0} className="h-7 w-7" />
                    </button>
                  ))}
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="review-text" className="mb-1.5 block text-sm font-bold text-ink-900">
                {labels.messageLabel}
              </label>
              <textarea
                id="review-text"
                name="text"
                rows={4}
                required
                minLength={10}
                placeholder={labels.messagePlaceholder}
                className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
              />
            </div>
            {!state.ok && state.error && (
              <p className="text-sm font-semibold text-red-600" role="alert">
                {labels.errorBody}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="h-12 justify-self-start rounded-full bg-ocean-700 px-8 font-display text-base font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
            >
              {pending ? labels.submitting : labels.submit}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
