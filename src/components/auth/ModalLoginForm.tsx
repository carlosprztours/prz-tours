/**
 * Login dentro del modal de reserva (componente de cliente).
 *
 * A diferencia del `LoginForm` de la página (que redirige), aquí todo es
 * JSON para NO navegar y no perder el borrador del formulario:
 * - Email + contraseña → Server Action `loginJson` → `onSuccess()`.
 * - Passkey (huella/Face ID) → hook compartido → `onSuccess()`.
 * - Google / registro → navegan, pero el borrador ya quedó guardado en
 *   `sessionStorage` y se restaura al volver.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

import { loginJson } from "@/lib/actions/auth";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";
import { usePasskeyLogin } from "./usePasskeyLogin";

type AuthDict = Dictionary["booking"];

export function ModalLoginForm({
  locale,
  dict,
  email,
  googleHref,
  signupHref,
  onSuccess,
}: {
  locale: Locale;
  dict: AuthDict;
  email: string;
  googleHref: string;
  signupHref: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passkey = usePasskeyLogin();

  async function submitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      const result = await loginJson(fd);
      if (!result.ok) {
        setError(dict.authModalInvalid ?? dict.authRequired);
        return;
      }
      onSuccess();
    } catch {
      setError(dict.authRequired);
    } finally {
      setBusy(false);
    }
  }

  async function submitPasskey() {
    setError(null);
    const result = await passkey.login(email, locale);
    if (result.ok) {
      onSuccess();
      return;
    }
    setError(
      result.error === "none"
        ? dict.authPasskeyNone
        : result.error === "unsupported"
          ? dict.authPasskeyUnsupported
          : dict.authPasskeyFailed,
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="font-display text-xl font-extrabold text-ink-900">
          {dict.authModalTitle}
        </h3>
        <p className="mt-1 text-sm text-ink-500">{dict.authModalSubtitle}</p>
      </div>

      <form onSubmit={submitPassword} className="grid gap-3">
        <div>
          <label htmlFor="modal-email" className="mb-1.5 block text-sm font-bold text-ink-900">
            {dict.emailLabel}
          </label>
          <input
            id="modal-email"
            type="email"
            value={email}
            disabled
            className="h-12 w-full rounded-xl border border-sand-200 bg-sand-50 px-4 text-sm text-ink-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor="modal-password" className="mb-1.5 block text-sm font-bold text-ink-900">
            {dict.authPasswordLabel}
          </label>
          <input
            id="modal-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
          />
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || passkey.busy}
          className="inline-flex h-12 items-center justify-center rounded-full bg-ocean-700 px-8 font-display text-base font-bold text-white shadow-lg transition hover:bg-ocean-800 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? dict.authSubmitting : dict.authSubmit}
        </button>
      </form>

      <button
        type="button"
        onClick={submitPasskey}
        disabled={busy || passkey.busy}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-sand-200 bg-white px-8 font-display text-base font-bold text-ink-900 shadow-sm transition hover:border-ocean-300 hover:bg-sand-50 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <rect x="4" y="10" width="16" height="10" rx="2.5" />
          <path strokeLinecap="round" d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5" />
        </svg>
        {dict.authPasskey}
      </button>

      <div className="mt-1">
        <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-ink-500">
          <span className="h-px flex-1 bg-sand-200" aria-hidden="true" />
          {dict.authOr}
          <span className="h-px flex-1 bg-sand-200" aria-hidden="true" />
        </div>
        <a
          href={googleHref}
          className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-sand-200 bg-white px-8 font-display text-base font-bold text-ink-900 shadow-sm transition hover:border-ocean-300 hover:bg-sand-50"
        >
          {dict.authGoogle}
        </a>
        <p className="mt-4 text-center text-sm text-ink-500">
          {dict.authNoAccount}{" "}
          <Link href={signupHref} className="font-bold text-ocean-700 hover:underline">
            {dict.authSignupLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
