/**
 * Formulario de login del staff (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import { login, type AuthResult } from "@/lib/actions/auth";
import type { Locale } from "@/types";

const initialState: AuthResult = { ok: false, error: "" };

const inputClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export function LoginForm({
  locale,
  next,
  labels,
}: {
  locale: Locale;
  next?: string;
  labels: {
    email: string;
    password: string;
    submit: string;
    submitting: string;
    invalid: string;
    required: string;
  };
}) {
  const action = useMemo(() => login.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-ink-900">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-ink-900">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      {!state.ok && state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {state.error === "invalid" ? labels.invalid : labels.required}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-ocean-700 px-8 font-display text-base font-bold text-white shadow-lg transition hover:bg-ocean-800 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
