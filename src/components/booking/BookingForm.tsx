/**
 * Formulario público de reserva (componente de cliente).
 *
 * Usa `useActionState` con la Server Action `bookTour`:
 * - Estado inicial: formulario.
 * - `pending`: botón deshabilitado con aviso.
 * - Éxito: muestra la referencia y el botón para continuar por WhatsApp
 *   (se abre en pestaña nueva; la reserva ya quedó guardada en D1).
 * - Error: marca los campos con su mensaje traducido.
 *
 * Los códigos de error que devuelve el servidor ("validation.x") se resuelven
 * contra el diccionario con `resolveError`.
 */
"use client";

import { useActionState, useMemo } from "react";

import { bookTour, type BookTourResult } from "@/lib/actions/book-tour";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";

export type BookingOption = {
  id: number;
  title: string;
  price: number;
};

type Props = {
  locale: Locale;
  booking: Dictionary["booking"];
  /** "opcional" / "optional" (de common). */
  optionalLabel: string;
  /** Título de la sección de traslados (para el selector de rutas). */
  transfersTitle: string;
  kind: "tour" | "transfer" | "custom";
  tours: BookingOption[];
  routes: { id: number; label: string; price15: number; price611: number }[];
  preselectedTourId?: number;
  preselectedRouteId?: number;
  /** Datos del cliente logueado para pre-rellenar (opcional). */
  defaults?: { name?: string; email?: string; phone?: string };
};

/** "validation.nameRequired" -> booking.validation.nameRequired */
function resolveError(
  booking: Dictionary["booking"],
  code: string,
): string {
  if (code === "validation.tourRequired") return booking.tourRequired;
  if (code === "validation.routeRequired") return booking.routeRequired;
  if (code === "validation.serverError") return booking.serverError;
  if (code === "validation.customRequired") return booking.customRequired;
  if (code.startsWith("validation.")) {
    const key = code.slice("validation.".length);
    const table = booking.validation as Record<string, string>;
    if (table[key]) return table[key];
  }
  return booking.errorHint;
}

const initialState: BookTourResult = { ok: false, errors: {} };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>;
}

const inputClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export function BookingForm({
  locale,
  booking: t,
  optionalLabel,
  transfersTitle,
  kind,
  tours,
  routes,
  preselectedTourId,
  preselectedRouteId,
  defaults,
}: Props) {
  const action = useMemo(
    () => bookTour.bind(null, locale),
    [locale],
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <h3 className="mt-4 font-display text-2xl font-extrabold text-ink-900">
          {t.successTitle}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{t.successBody}</p>
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-ink-500">
          {t.successReference}
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold tracking-wide text-ocean-700">
          {state.reference}
        </p>
        <a
          href={state.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#25d366] px-7 font-display text-base font-bold text-white shadow-lg transition hover:bg-[#1fb857]"
        >
          {t.successWhatsapp}
        </a>
        <p className="mt-3 text-xs text-ink-500">{t.successEmail}</p>
      </div>
    );
  }

  const errors = state.ok ? {} : state.errors;

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="kind" value={kind} />

      {kind === "tour" ? (
        <div>
          <label htmlFor="tourId" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.tourLabel}
          </label>
          <select
            id="tourId"
            name="tourId"
            required
            defaultValue={preselectedTourId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              {t.tourLabel}…
            </option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.title} · ${tour.price}
              </option>
            ))}
          </select>
          <FieldError message={errors.tourId && resolveError(t, errors.tourId)} />
        </div>
      ) : kind === "transfer" ? (
        <div>
          <label htmlFor="transferRouteId" className="mb-1.5 block text-sm font-bold text-ink-900">
            {transfersTitle}
          </label>
          <select
            id="transferRouteId"
            name="transferRouteId"
            required
            defaultValue={preselectedRouteId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              {transfersTitle}…
            </option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} · ${r.price15}–${r.price611}
              </option>
            ))}
          </select>
          <FieldError message={errors.transferRouteId && resolveError(t, errors.transferRouteId)} />
        </div>
      ) : (
        <div className="rounded-2xl border border-coral-500/30 bg-coral-500/5 p-4">
          <label htmlFor="notes-custom" className="mb-1.5 block font-display text-base font-bold text-ink-900">
            {t.customDescription}
          </label>
          <textarea
            id="notes-custom"
            name="notes"
            rows={5}
            required
            minLength={10}
            placeholder={t.customPlaceholder}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
          />
          <FieldError message={errors.notes && resolveError(t, errors.notes)} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bookedFor-button" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.dateLabel}
          </label>
          <DatePicker
            id="bookedFor-button"
            name="bookedFor"
            locale={locale}
            labels={{
              placeholder: t.datePlaceholder,
              today: t.todayLabel,
              clear: t.clearLabel,
              prevMonth: t.prevMonthLabel,
              nextMonth: t.nextMonthLabel,
            }}
          />
          <p className="mt-1 text-xs text-ink-500">{t.dateHint}</p>
          <FieldError message={errors.bookedFor && resolveError(t, errors.bookedFor)} />
        </div>
        <div>
          <label htmlFor="guests" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.guestsLabel}
          </label>
          <input
            id="guests"
            name="guests"
            type="number"
            min={1}
            max={60}
            defaultValue={2}
            required
            className={inputClass}
          />
          <FieldError message={errors.guests && resolveError(t, errors.guests)} />
        </div>
      </div>

      <div>
        <label htmlFor="customerName" className="mb-1.5 block text-sm font-bold text-ink-900">
          {t.nameLabel}
        </label>
        <input
          id="customerName"
          name="customerName"
          type="text"
          autoComplete="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder={t.namePlaceholder}
          className={inputClass}
        />
        <FieldError message={errors.customerName && resolveError(t, errors.customerName)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerEmail" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.emailLabel}
          </label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            autoComplete="email"
            required
            defaultValue={defaults?.email ?? ""}
            placeholder={t.emailPlaceholder}
            className={inputClass}
          />
          <FieldError message={errors.customerEmail && resolveError(t, errors.customerEmail)} />
        </div>
        <div>
          <label htmlFor="customerPhone" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.phoneLabel}
          </label>
          <input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={defaults?.phone ?? ""}
            placeholder={t.phonePlaceholder}
            className={inputClass}
          />
          <FieldError message={errors.customerPhone && resolveError(t, errors.customerPhone)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="hotel" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.hotelLabel} <span className="font-medium text-ink-500">({optionalLabel})</span>
          </label>
          <input id="hotel" name="hotel" type="text" placeholder={t.hotelPlaceholder} className={inputClass} />
          <p className="mt-1 text-xs text-ink-500">{t.hotelHint}</p>
        </div>
        <div>
          <label htmlFor="pickupTime-button" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.pickupTimeLabel} <span className="font-medium text-ink-500">({optionalLabel})</span>
          </label>
          <TimePicker
            id="pickupTime-button"
            name="pickupTime"
            locale={locale}
            labels={{ placeholder: t.timePlaceholder, clear: t.anyTimeLabel }}
          />
        </div>
      </div>

      {kind !== "custom" && (
        <div>
          <label htmlFor="notes" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.notesLabel} <span className="font-medium text-ink-500">({optionalLabel})</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder={t.notesPlaceholder}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
          />
        </div>
      )}

      {errors.form && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {resolveError(t, errors.form)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-coral-700 px-8 font-display text-base font-bold text-white shadow-lg shadow-coral-500/30 transition hover:bg-coral-800 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? t.submitting : t.submit}
      </button>
      {pending && <p className="text-center text-xs text-ink-500">{t.submittingHint}</p>}
    </form>
  );
}
