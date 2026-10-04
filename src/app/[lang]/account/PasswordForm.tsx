/**
 * Cambio de contraseña propia (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import { changePassword, type PasswordResult } from "@/lib/actions/profile";
import type { Locale } from "@/types";

const initialState: PasswordResult = { ok: false, error: "" };

const inputClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export function PasswordForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: {
    title: string;
    current: string;
    next: string;
    hint: string;
    save: string;
    saving: string;
    saved: string;
    errors: Record<string, string>;
  };
}) {
  const action = useMemo(() => changePassword.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-sand-200 bg-white p-6">
      <h2 className="font-display text-xl font-extrabold text-ink-900">{labels.title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-bold text-ink-900">
            {labels.current}
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="mb-1.5 block text-sm font-bold text-ink-900">
            {labels.next}
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-500">{labels.hint}</p>
        </div>
      </div>

      {!state.ok && state.error && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {labels.errors[state.error] ?? state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-semibold text-emerald-600" role="status">
          {labels.saved}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 justify-self-start rounded-full bg-ocean-700 px-6 text-sm font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
      >
        {pending ? labels.saving : labels.save}
      </button>
    </form>
  );
}
