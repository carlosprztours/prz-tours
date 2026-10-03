/**
 * Formulario de contacto (componente de cliente).
 *
 * Envía a la Server Action `sendContactMessage` y muestra confirmación.
 */
"use client";

import { useActionState, useMemo } from "react";

import { sendContactMessage, type ContactResult } from "@/lib/actions/contact-message";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";

const initialState: ContactResult = { ok: false, errors: {} };

function resolveError(contact: Dictionary["contact"], code: string): string {
  if (code.startsWith("validation.")) {
    const key = code.slice("validation.".length);
    const table = contact.validation as Record<string, string>;
    if (table[key]) return table[key];
  }
  return contact.errorHint;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>;
}

const inputClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export function ContactForm({ locale, contact: t }: { locale: Locale; contact: Dictionary["contact"] }) {
  const action = useMemo(() => sendContactMessage.bind(null, locale), [locale]);
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
        <p className="mt-2 text-sm text-ink-600">{t.successBody}</p>
      </div>
    );
  }

  const errors = state.ok ? {} : state.errors;

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.nameLabel}
          </label>
          <input id="name" name="name" type="text" autoComplete="name" required className={inputClass} />
          <FieldError message={errors.name && resolveError(t, errors.name)} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.emailLabel}
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
          <FieldError message={errors.email && resolveError(t, errors.email)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.phoneLabel}
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
        </div>
        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-bold text-ink-900">
            {t.subjectLabel}
          </label>
          <input id="subject" name="subject" type="text" className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-bold text-ink-900">
          {t.messageLabel}
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder={t.messagePlaceholder}
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
        />
        <FieldError message={errors.message && resolveError(t, errors.message)} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-ocean-600 px-8 font-display text-base font-bold text-white shadow-lg transition hover:bg-ocean-700 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
