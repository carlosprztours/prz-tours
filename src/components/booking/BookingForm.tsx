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

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { bookTour, type BookTourResult } from "@/lib/actions/book-tour";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";
import { DatePicker } from "@/components/ui/DatePicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { TimePicker } from "@/components/ui/TimePicker";
import { ModalLoginForm } from "@/components/auth/ModalLoginForm";
import { AvailabilityNote } from "./AvailabilityNote";
import { DepositButton } from "./DepositButton";

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
  /** `false` si el visitante aún no entra (se pide login con modal). */
  isAuthenticated: boolean;
  /** Ruta actual (p. ej. `/es/book?type=transfer`): a dónde volver tras Google/signup. */
  returnPath: string;
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

/** Borrador del formulario en `sessionStorage` (no se pierde al ir al login). */
const DRAFT_KEY = "prz-booking-draft";

type BookingDraft = {
  savedAt: number;
  tourId?: string;
  transferRouteId?: string;
  bookedFor?: string;
  guests?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  hotel?: string;
  cruisePort?: string;
  pickupTime?: string;
  promoCode?: string;
  notes?: string;
};

const DRAFT_FIELDS = [
  "tourId",
  "transferRouteId",
  "bookedFor",
  "guests",
  "customerName",
  "customerEmail",
  "customerPhone",
  "hotel",
  "cruisePort",
  "pickupTime",
  "promoCode",
  "notes",
] as const;

function loadDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as BookingDraft;
    // Borradores de más de un día se descartan.
    if (!draft.savedAt || Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function saveDraft(form: HTMLFormElement): void {
  try {
    const data = new FormData(form);
    const draft: BookingDraft = { savedAt: Date.now() };
    for (const key of DRAFT_FIELDS) {
      const value = data.get(key);
      if (typeof value === "string" && value.trim() !== "") {
        (draft as Record<string, string | number>)[key] = value;
      }
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* almacenamiento no disponible */
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

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
  isAuthenticated,
  returnPath,
}: Props) {
  const action = useMemo(
    () => bookTour.bind(null, locale),
    [locale],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  // Borrador guardado al ir al login/Google/registro (se lee una sola vez).
  const [draft] = useState<BookingDraft | null>(() => {
    const d = loadDraft();
    if (d) clearDraft();
    return d;
  });
  const [date, setDate] = useState(draft?.bookedFor ?? "");
  const [showLogin, setShowLogin] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [loginEmail, setLoginEmail] = useState(
    draft?.customerEmail ?? defaults?.email ?? "",
  );
  const successRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const authed = isAuthenticated || justLogged;

  // Al confirmar, lleva la vista al mensaje de éxito (el formulario es
  // largo y el mensaje aparece arriba).
  useEffect(() => {
    if (state.ok) {
      clearDraft();
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.ok]);
  const [tourSel, setTourSel] = useState(
    draft?.tourId ?? (preselectedTourId ? String(preselectedTourId) : ""),
  );

  if (state.ok) {
    return (
      <div ref={successRef} className="anim-pop rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <span className="relative mx-auto flex h-20 w-20 items-center justify-center" aria-hidden="true">
          <span className="anim-ring absolute inset-0 rounded-full bg-emerald-400/40" />
          <span className="anim-ring absolute inset-0 rounded-full bg-emerald-400/30" style={{ animationDelay: "0.6s" }} />
          <svg viewBox="0 0 56 56" className="h-20 w-20">
            <circle
              cx="28"
              cy="28"
              r="26"
              fill="none"
              stroke="#10b981"
              strokeWidth={4}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100}
              className="draw-anim"
            />
            <path
              d="M17 29l8 8L39 21"
              fill="none"
              stroke="#059669"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100}
              className="draw-anim-check"
            />
          </svg>
        </span>
        <h3 className="anim-fade-up mt-4 font-display text-2xl font-extrabold text-ink-900" style={{ animationDelay: "0.15s" }}>
          {t.successTitle}
        </h3>
        <p className="anim-fade-up mx-auto mt-2 max-w-md text-sm text-ink-600" style={{ animationDelay: "0.25s" }}>{t.successBody}</p>
        <p className="anim-fade-up mt-5 text-xs font-bold uppercase tracking-widest text-ink-500" style={{ animationDelay: "0.35s" }}>
          {t.successReference}
        </p>
        <p className="anim-fade-up mt-1 font-display text-3xl font-extrabold tracking-wide text-ocean-700" style={{ animationDelay: "0.45s" }}>
          {state.reference}
        </p>
        {state.canPayDeposit && state.depositDue > 0 && (
          <div className="anim-fade-up mx-auto mt-5 max-w-sm rounded-2xl border border-ocean-100 bg-ocean-50 p-4" style={{ animationDelay: "0.55s" }}>
            <p className="mb-3 text-xs text-ink-600">{t.depositInfo}</p>
            <DepositButton
              reference={state.reference}
              email={state.email}
              amount={state.depositDue}
              currency={state.currency}
              labels={{
                pay: t.depositPay,
                paying: t.depositPaying,
                failed: t.depositFailed,
              }}
            />
          </div>
        )}
        <a
          href={state.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="anim-fade-up mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#25d366] px-7 font-display text-base font-bold text-white shadow-lg transition hover:bg-[#1fb857]"
          style={{ animationDelay: "0.65s" }}
        >
          {t.successWhatsapp}
        </a>
        <p className="anim-fade-up mt-3 text-xs text-ink-500" style={{ animationDelay: "0.75s" }}>{t.successEmail}</p>
      </div>
    );
  }

  const errors = state.ok ? {} : state.errors;

  // Sin sesión: guarda el borrador y pide entrar (el modal no navega,
  // salvo Google/registro, que vuelven aquí con el borrador intacto).
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (authed) return;
    e.preventDefault();
    saveDraft(e.currentTarget);
    const typed = new FormData(e.currentTarget).get("customerEmail");
    setLoginEmail(
      typeof typed === "string" && typed.includes("@")
        ? typed.trim()
        : (draft?.customerEmail ?? defaults?.email ?? ""),
    );
    setShowLogin(true);
  }

  function handleLoginSuccess() {
    setShowLogin(false);
    setJustLogged(true);
    setWelcome(true);
    router.refresh();
  }

  const modalEmail = loginEmail;

  return (
    <>
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-4">
      <input type="hidden" name="kind" value={kind} />

      {/* Honeypot anti-spam: oculto para humanos, visible para bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {welcome && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
          {t.authWelcome}
        </p>
      )}

      {kind === "tour" ? (
        <div>
          <label htmlFor="tourId" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.tourLabel}
          </label>
          <select
            id="tourId"
            name="tourId"
            required
            value={tourSel}
            onChange={(e) => setTourSel(e.target.value)}
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
            defaultValue={draft?.transferRouteId ?? preselectedRouteId ?? ""}
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
            defaultValue={draft?.notes ?? ""}
            placeholder={t.customPlaceholder}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
          />
          <FieldError message={errors.notes && resolveError(t, errors.notes)} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bookedFor-button" className="mb-1.5 block text-sm font-bold text-ink-900">
            {kind === "transfer" ? t.dateLabelTransfer : t.dateLabel}
          </label>
          <DatePicker
            id="bookedFor-button"
            name="bookedFor"
            locale={locale}
            value={date}
            onChange={setDate}
            labels={{
              placeholder: t.datePlaceholder,
              today: t.todayLabel,
              clear: t.clearLabel,
              prevMonth: t.prevMonthLabel,
              nextMonth: t.nextMonthLabel,
            }}
          />
          <p className="mt-1 text-xs text-ink-500">{t.dateHint}</p>
          {kind === "tour" && tourSel && date && (
            <AvailabilityNote
              tourId={Number(tourSel)}
              date={date}
              labels={{
                available: t.spotsLeft,
                lastSpots: t.lastSpots,
                soldOut: t.soldOutHint,
              }}
            />
          )}
          <FieldError message={errors.bookedFor && resolveError(t, errors.bookedFor)} />
        </div>
        <div>
          <label htmlFor="guests" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.guestsLabel}
          </label>
          {kind === "transfer" ? (
            <input
              id="guests"
              name="guests"
              type="number"
              min={1}
              max={60}
              defaultValue={draft?.guests ?? 2}
              required
              className={inputClass}
            />
          ) : (
            <select id="guests" name="guests" required defaultValue={draft?.guests ?? 2} className={inputClass}>
              {Array.from({ length: 10 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
          {kind !== "transfer" ? (
            <p className="mt-1 text-xs text-ink-500">{t.guestsHint}</p>
          ) : (
            <p className="mt-1 text-xs text-ink-500">{t.guestsHintTransfer}</p>
          )}
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
          defaultValue={draft?.customerName ?? defaults?.name ?? ""}
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
            defaultValue={draft?.customerEmail ?? defaults?.email ?? ""}
            placeholder={t.emailPlaceholder}
            className={inputClass}
          />
          <FieldError message={errors.customerEmail && resolveError(t, errors.customerEmail)} />
        </div>
        <div>
          <label htmlFor="customerPhone" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.phoneLabel}
          </label>
          <PhoneInput
            id="customerPhone"
            name="customerPhone"
            locale={locale}
            required
            defaultValue={draft?.customerPhone ?? defaults?.phone ?? ""}
            placeholder={t.phonePlaceholder}
          />
          <FieldError message={errors.customerPhone && resolveError(t, errors.customerPhone)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="hotel" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.hotelLabel} <span className="font-medium text-ink-500">({optionalLabel})</span>
          </label>
          <input id="hotel" name="hotel" type="text" maxLength={160} defaultValue={draft?.hotel ?? ""} placeholder={t.hotelPlaceholder} className={inputClass} />
          <p className="mt-1 text-xs text-ink-500">{t.hotelHint}</p>
        </div>
        <div>
          <label htmlFor="cruisePort" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.cruisePortLabel} <span className="font-medium text-ink-500">({optionalLabel})</span>
          </label>
          <input id="cruisePort" name="cruisePort" type="text" maxLength={160} defaultValue={draft?.cruisePort ?? ""} placeholder={t.cruisePortPlaceholder} className={inputClass} />
          <p className="mt-1 text-xs text-ink-500">{t.cruisePortHint}</p>
          <FieldError message={errors.cruisePort && resolveError(t, errors.cruisePort)} />
        </div>
      </div>

      <div>
        <label htmlFor="pickupTime-button" className="mb-1.5 block text-sm font-bold text-ink-900">
          {t.pickupTimeLabel} <span className="font-medium text-ink-500">({optionalLabel})</span>
        </label>
        <TimePicker
          id="pickupTime-button"
          name="pickupTime"
          locale={locale}
          defaultValue={draft?.pickupTime ?? ""}
          labels={{ placeholder: t.timePlaceholder, clear: t.anyTimeLabel }}
        />
      </div>

      <div>
        <label htmlFor="promoCode" className="mb-1.5 block text-sm font-bold text-ink-900">
          {t.promoLabel} <span className="font-medium text-ink-500">({optionalLabel})</span>
        </label>
        <input
          id="promoCode"
          name="promoCode"
          type="text"
          autoComplete="off"
          defaultValue={draft?.promoCode ?? ""}
          placeholder={t.promoPlaceholder}
          className={`${inputClass} uppercase`}
        />
        <FieldError message={errors.promoCode && resolveError(t, errors.promoCode)} />
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
            defaultValue={draft?.notes ?? ""}
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

      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.authModalTitle}
          onClick={() => setShowLogin(false)}
        >
          <div
            className="anim-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                aria-label={t.authClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:bg-sand-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ModalLoginForm
              locale={locale}
              dict={t}
              email={modalEmail}
              googleHref={`/api/auth/google?locale=${locale}&next=${encodeURIComponent(returnPath)}`}
              signupHref={`/${locale}/signup?next=${encodeURIComponent(returnPath)}`}
              onSuccess={handleLoginSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
