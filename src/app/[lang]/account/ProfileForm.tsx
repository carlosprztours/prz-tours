/**
 * Formulario de datos del cliente en "Mi cuenta" (componente de cliente).
 *
 * Nombre y teléfono. Al guardar, las próximas reservas pre-rellenan esos
 * campos para que el cliente escriba lo mínimo.
 */
"use client";

import { useActionState, useMemo } from "react";

import { updateProfile, type ProfileResult } from "@/lib/actions/profile";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { Locale } from "@/types";

const initialState: ProfileResult = { ok: false, error: "" };

const inputClass =
  "h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100";

export function ProfileForm({
  locale,
  initial,
  labels,
}: {
  locale: Locale;
  initial: { name: string; email: string; phone: string };
  labels: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    phone: string;
    save: string;
    saving: string;
    saved: string;
    errors: Record<string, string>;
  };
}) {
  const action = useMemo(() => updateProfile.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-sand-200 bg-white p-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-ink-900">{labels.title}</h2>
        <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-name" className="mb-1.5 block text-sm font-bold text-ink-900">
            {labels.name}
          </label>
          <input
            id="profile-name"
            name="name"
            type="text"
            required
            minLength={2}
            defaultValue={initial.name}
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-bold text-ink-900">
            {labels.phone}
          </label>
          <PhoneInput
            id="profile-phone"
            name="phone"
            locale={locale}
            defaultValue={initial.phone}
            placeholder="+1 809 000 0000"
          />
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-bold text-ink-900">{labels.email}</span>
        <p className="text-sm text-ink-600">{initial.email}</p>
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
