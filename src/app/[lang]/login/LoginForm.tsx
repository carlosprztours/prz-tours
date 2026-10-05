/**
 * Formulario de login del staff (componente de cliente).
 */
"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useActionState, useMemo, useState } from "react";

import { login, type AuthResult } from "@/lib/actions/auth";
import type { Locale } from "@/types";

const initialState: AuthResult = { ok: false, error: "" };

/** Último email usado en este dispositivo (para recordarlo). */
const LAST_EMAIL_KEY = "prz-last-email";

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
    server: string;
    emailRequired: string;
    passkey: string;
    passkeyWorking: string;
    passkeyFailed: string;
    passkeyNone: string;
    passkeyUnsupported: string;
  };
}) {
  const action = useMemo(() => login.bind(null, locale), [locale]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(LAST_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [pkBusy, setPkBusy] = useState(false);
  const [pkError, setPkError] = useState<string | null>(null);

  // Entrada con passkey (huella, Face ID o PIN). Sin email escrito usa la
  // ceremonia descubrible (el dispositivo muestra tus cuentas).
  async function passkeyLogin() {
    const mail = email.includes("@") ? email : "";
    setPkBusy(true);
    setPkError(null);
    try {
      if (!browserSupportsWebAuthn()) {
        setPkError(labels.passkeyUnsupported);
        return;
      }
      const optsRes = await fetch("/api/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail }),
      });
      const options = (await optsRes.json().catch(() => null)) as {
        error?: string;
        challenge?: string;
      } | null;
      if (!optsRes.ok || !options || options.error || !options.challenge) {
        setPkError(
          options?.error === "no-credentials"
            ? labels.passkeyNone
            : labels.passkeyFailed,
        );
        return;
      }
      const credential = await startAuthentication({
        optionsJSON:
          options as unknown as PublicKeyCredentialRequestOptionsJSON,
      });
      const verRes = await fetch("/api/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail, credential, locale }),
      });
      const ver = (await verRes.json().catch(() => null)) as {
        ok?: boolean;
        redirect?: string;
      } | null;
      if (!verRes.ok || !ver?.ok || !ver.redirect) {
        setPkError(labels.passkeyFailed);
        return;
      }
      if (mail) {
        try {
          localStorage.setItem(LAST_EMAIL_KEY, mail.trim().toLowerCase());
        } catch {
          /* almacenamiento no disponible */
        }
      }
      window.location.href = ver.redirect;
    } catch {
      setPkError(labels.passkeyFailed);
    } finally {
      setPkBusy(false);
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    try {
      const value = new FormData(e.currentTarget).get("email");
      if (typeof value === "string" && value.includes("@")) {
        localStorage.setItem(LAST_EMAIL_KEY, value.trim().toLowerCase());
      }
    } catch {
      /* almacenamiento no disponible */
    }
  };

  const message =
    !state.ok && state.error
      ? state.error === "invalid"
        ? labels.invalid
        : state.error === "server"
          ? labels.server
          : labels.required
      : null;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-4">
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
          value={email}
          suppressHydrationWarning
          onChange={(e) => setEmail(e.target.value)}
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

      {message && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-ocean-700 px-8 font-display text-base font-bold text-white shadow-lg transition hover:bg-ocean-800 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? labels.submitting : labels.submit}
      </button>

      <button
        type="button"
        onClick={passkeyLogin}
        disabled={pkBusy || pending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-sand-200 bg-white px-8 font-display text-base font-bold text-ink-900 shadow-sm transition hover:border-ocean-300 hover:bg-sand-50 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <rect x="4" y="10" width="16" height="10" rx="2.5" />
          <path strokeLinecap="round" d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5" />
        </svg>
        {pkBusy ? labels.passkeyWorking : labels.passkey}
      </button>
      {pkError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {pkError}
        </p>
      )}
    </form>
  );
}
