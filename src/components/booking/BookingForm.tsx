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
import { PaymentChoice } from "./PaymentChoice";
import { PayPalCheckout } from "./PayPalCheckout";

export type BookingOption = {
  id: number;
  title: string;
  price: number;
};

type Props = {
  locale: Locale;
  booking: Dictionary["booking"];
  optionalLabel: string;
  transfersTitle: string;
  kind: "tour" | "transfer" | "custom";
  tours: BookingOption[];
  routes: { id: number; label: string; price15: number; price611: number }[];
  preselectedTourId?: number;
  preselectedRouteId?: number;
  defaults?: { name?: string; email?: string; phone?: string };
  isAuthenticated: boolean;
  returnPath: string;
  /** Aviso de vuelta de PayPal por redirección (sin JS): cancelación o fallo. */
  redirectError?: string;
};

function resolveError(
  booking: Dictionary["booking"],
  code: string,
): string {
  if (code === "validation.tourRequired") return booking.tourRequired;
  if (code === "validation.routeRequired") return booking.routeRequired;
  if (code === "validation.serverError") return booking.serverError;
  if (code === "validation.customRequired") return booking.customRequired;
  if (code === "validation.paypalNotConfigured") return booking.paypalNotConfigured;
  if (code === "validation.paypalError") return booking.paypalError;
  if (code === "validation.paymentMethodRequired") return booking.paymentMethodRequired;
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
  paymentMethod?: string;
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
  "paymentMethod",
] as const;

function loadDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as BookingDraft;
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
  redirectError,
}: Props) {
  const action = useMemo(
    () => bookTour.bind(null, locale),
    [locale],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  // El borrador NO se borra al montar: se conserva para que el cliente no
  // pierda sus datos si recarga la página (login con Google, vuelta de PayPal
  // por redirección, etc.). Solo se limpia al confirmar una reserva.
  const [draft] = useState<BookingDraft | null>(() => loadDraft());
  const [date, setDate] = useState(draft?.bookedFor ?? "");
  const [showLogin, setShowLogin] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [loginEmail, setLoginEmail] = useState(
    draft?.customerEmail ?? defaults?.email ?? "",
  );
  const successRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // NUEVO: estado para elegir método de pago antes de enviar (se restaura
  // desde el borrador para que sobreviva a la vuelta del login con Google).
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "paypal" | null>(() => {
    const m = draft?.paymentMethod;
    return m === "paypal" || m === "cash" ? m : null;
  });
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  // Orden de PayPal ya creada en el servidor: al tenerla, se muestran los
  // botones del SDK inline (sin salir de la página).
  const [paypalOrder, setPaypalOrder] = useState<{
    id: string;
    clientId: string;
    mode: "sandbox" | "live";
    currency: string;
  } | null>(null);
  const [paypalBusy, setPaypalBusy] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  const authed = isAuthenticated || justLogged;

  // Redirigir a PayPal cuando la acción devuelve un orderId
  useEffect(() => {
    const s = state as { ok: true; paypalOrderId?: string };
    if (s.ok && s.paypalOrderId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaypalOrderId(s.paypalOrderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  // Redirección a PayPal (solo flujo sin JS: la acción devolvió un orderId)
  useEffect(() => {
    if (paypalOrderId) {
      clearDraft();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/api/paypal/redirect?orderID=${paypalOrderId}`;
    }
  }, [paypalOrderId]);

  // Al confirmar, lleva la vista al mensaje de éxito (el formulario es
  // largo y el mensaje aparece arriba).
  useEffect(() => {
    const s = state as { ok: true; paypalOrderId?: string };
    if (s.ok && !s.paypalOrderId) {
      clearDraft();
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <PaymentChoice
          reference={state.reference}
          currency={state.currency}
          labels={{
            chooseTitle: t.paymentChoiceTitle,
            paypal: t.paymentChoicePaypal,
            paypalReady: t.paymentChoicePaypalReady,
            paypalFail: t.paymentChoicePaypalFail,
            cash: t.paymentChoiceCash,
            cashNote: t.paymentChoiceCashNote,
            paid: t.paymentChoicePaid,
          }}
        />
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // El borrador se guarda en CADA intento para que los datos sobrevivan
    // al login o a cualquier recarga intermedia.
    saveDraft(e.currentTarget);
    if (!authed) {
      e.preventDefault();
      const typed = new FormData(e.currentTarget).get("customerEmail");
      setLoginEmail(
        typeof typed === "string" && typed.includes("@")
          ? typed.trim()
          : (draft?.customerEmail ?? defaults?.email ?? ""),
      );
      setShowLogin(true);
      return;
    }
    if (paymentMethod === "paypal") {
      // Pago inline: creamos la orden sin salir de la página y mostramos
      // los botones de PayPal aquí mismo (los datos NO se pierden).
      e.preventDefault();
      void startPayPalCheckout(e.currentTarget);
    }
  }

  async function startPayPalCheckout(form: HTMLFormElement) {
    setPaypalBusy(true);
    setPaypalError(null);
    try {
      const payload: Record<string, string> = {};
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === "string") payload[key] = value;
      }
      const res = await fetch("/api/paypal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale }),
      });
      const body = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            reference?: string;
            id?: string;
            clientId?: string;
            mode?: "sandbox" | "live";
            currency?: string;
          }
        | null;
      if (res.ok && body?.ok && body.reference) {
        // No había nada que cobrar: la reserva ya se creó en el servidor.
        clearDraft();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/${locale}/book/success?ref=${encodeURIComponent(body.reference)}`;
        return;
      }
      if (res.ok && body?.id && body.clientId && body.mode && body.currency) {
        setPaypalOrder({
          id: body.id,
          clientId: body.clientId,
          mode: body.mode,
          currency: body.currency,
        });
        return;
      }
      setPaypalError(t.paypalError);
    } catch {
      setPaypalError(t.paypalError);
    } finally {
      setPaypalBusy(false);
    }
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
        {redirectError && (
          <div
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
            role="alert"
          >
            <p className="flex items-start gap-2">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {redirectError}
            </p>
          </div>
        )}
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

        {/* Selector de método de pago (obligatorio) */}
        {!paymentMethod && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-sand-300 bg-white p-5">
            <h3 className="font-display text-base font-bold text-ink-900 mb-1">
              {t.paymentMethodTitle}
              <span className="ml-1 text-coral-700" aria-hidden="true">
                *
              </span>
            </h3>
            <p className="mb-3 text-xs font-medium text-ink-500">
              {t.paymentMethodChooseFirst}
            </p>
            {errors.paymentMethod && (
              <FieldError message={resolveError(t, errors.paymentMethod)} />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                disabled={pending}
                className="relative flex flex-col items-center p-4 rounded-xl border-2 border-ocean-200 bg-white hover:border-ocean-500 hover:bg-ocean-50 transition disabled:opacity-50"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ocean-100 text-ocean-700 mb-2">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 1.5c4.61 0 8.35 3.17 9.65 7.54-.86.84-1.97 1.5-3.16 1.5H8.4v-3.6h4.48c-.74-2.4-2.94-4.41-5.74-4.41-3.26 0-5.92 2.66-5.92 5.92 0 3.25 2.67 5.92 5.92 5.92 2.47 0 4.55-1.77 5.22-4.08l-3.32-2.36c-.91 1.13-2.13 1.9-3.56 1.9-2.78 0-5.02-2.25-5.02-5.03 0-2.79 2.23-5.03 5.01-5.03 1.63 0 3.06.96 3.75 2.27l2.92-2.82C14.72 3.62 13.02 3 11.03 3 7.59 3 4.8 5.79 4.8 9.24c0 1.58.56 3.04 1.46 4.15L3 16.74c3.63-.85 6.5-3.61 6.5-6.74z"/>
                  </svg>
                </div>
                <span className="font-bold text-ink-900">{t.paymentMethodPaypal}</span>
                <span className="text-xs text-ink-500 mt-1 text-center">{t.paymentMethodPaypalDesc}</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                disabled={pending}
                className="relative flex flex-col items-center p-4 rounded-xl border-2 border-sand-200 bg-white hover:border-sand-400 hover:bg-sand-50 transition disabled:opacity-50"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 text-sand-700 mb-2">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <span className="font-bold text-ink-900">{t.paymentMethodCash}</span>
                <span className="text-xs text-ink-500 mt-1 text-center">{t.paymentMethodCashDesc}</span>
              </button>
            </div>
          </div>
      )}

      {paymentMethod && (
        <div className="mt-4 rounded-2xl border-2 border-coral-300 bg-coral-50 p-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <span className="text-sm font-bold text-coral-800">
              {paymentMethod === "paypal" ? (
                <>
                  {t.paymentMethodPaypal} · {t.paymentMethodPaypalDesc}
                </>
              ) : (
                <>
                  {t.paymentMethodCash} · {t.paymentMethodCashDesc}
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPaymentMethod(null);
              setPaypalOrder(null);
              setPaypalError(null);
            }}
            className="mt-2 text-xs font-bold text-coral-700 underline"
          >
            {t.paymentMethodChange}
          </button>
          <input type="hidden" name="paymentMethod" value={paymentMethod} />
        </div>
      )}

      {paypalError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {paypalError}
        </p>
      )}

      {errors.form && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {resolveError(t, errors.form)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || paypalBusy || !!paypalOrder || !paymentMethod}
        className="inline-flex h-12 items-center justify-center rounded-full bg-coral-700 px-8 font-display text-base font-bold text-white shadow-lg shadow-coral-500/30 transition hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {paymentMethod === "paypal"
          ? paypalBusy
            ? t.paypalProcessing
            : t.submitPaypal
          : pending
            ? t.submitting
            : t.submit}
      </button>
      {!paymentMethod && !pending && (
        <p className="text-center text-xs font-semibold text-coral-700" role="status">
          {t.paymentMethodRequired}
        </p>
      )}
      {pending && <p className="text-center text-xs text-ink-500">{t.submittingHint}</p>}

      {paypalOrder && (
        <PayPalCheckout
          orderId={paypalOrder.id}
          clientId={paypalOrder.clientId}
          mode={paypalOrder.mode}
          currency={paypalOrder.currency}
          labels={{
            title: t.paypalCheckoutTitle,
            hint: t.paypalCheckoutHint,
            processing: t.paypalProcessing,
            cancel: t.paypalCancelHint,
            fail: t.paymentChoicePaypalFail,
          }}
          onPaid={(reference) => {
            clearDraft();
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = `/${locale}/book/success?ref=${encodeURIComponent(reference)}`;
          }}
        />
      )}
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