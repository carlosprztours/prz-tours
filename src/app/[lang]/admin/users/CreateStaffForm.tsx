/**
 * Formulario para crear un miembro del staff (componente de cliente).
 */
"use client";

import { useActionState, useMemo } from "react";

import { createStaffUser, type UsersResult } from "@/lib/admin/users";

const initialState: UsersResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";

export function CreateStaffForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    title: string;
    name: string;
    email: string;
    password: string;
    role: string;
    editor: string;
    admin: string;
    submit: string;
    errors: Record<string, string>;
  };
}) {
  const action = useMemo(() => createStaffUser.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">{labels.title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required minLength={2} placeholder={labels.name} className={inputClass} aria-label={labels.name} />
        <input name="email" type="email" required placeholder={labels.email} className={inputClass} aria-label={labels.email} />
        <input name="password" type="password" required minLength={8} placeholder={labels.password} className={inputClass} aria-label={labels.password} />
        <select name="role" defaultValue="editor" className={inputClass} aria-label={labels.role}>
          <option value="editor">{labels.editor}</option>
          <option value="admin">{labels.admin}</option>
        </select>
      </div>
      {!state.ok && state.error && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {labels.errors[state.error] ?? state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-semibold text-emerald-600" role="status">
          OK
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-10 justify-self-start rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
      >
        {labels.submit}
      </button>
    </form>
  );
}
