/**
 * Formulario de registro público (componente de cliente).
 *
 * Crea una cuenta normal (`customer`). La promoción a staff es manual desde
 * el panel, nunca desde aquí.
 */
"use client";

import { useActionState, useMemo } from "react";

import { signup, type AuthResult } from "@/lib/actions/auth";
import type { Locale } from "@/types";

const initialState: AuthResult = { ok: false, error: "" };

const inputClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export function SignupForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: {
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    submit: string;
    submitting: string;
    invalidName: string;
    invalidEmail: string;
    weakPassword: string;
    emailTaken: string;
    server: string;
  };
}) {
  const action = useMemo(() => signup.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  const message =
    !state.ok && state.error
      ? state.error === "email-taken"
        ? labels.emailTaken
        : state.error === "invalid-email"
          ? labels.invalidEmail
          : state.error === "weak-password"
            ? labels.weakPassword
            : state.error === "server"
              ? labels.server
              : labels.invalidName
      : null;

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-bold text-ink-900">
          {labels.name}
        </label>
        <input id="name" name="name" type="text" autoComplete="name" required minLength={2} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-ink-900">
          {labels.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-ink-900">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-500">{labels.passwordHint}</p>
      </div>

      {message && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-coral-700 px-8 font-display text-base font-bold text-white shadow-lg shadow-coral-500/30 transition hover:bg-coral-800 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
