/**
 * Entrada con passkey reutilizable (huella, Face ID o PIN).
 *
 * `login(email, locale)` pide las opciones, abre el diálogo del
 * dispositivo con `startAuthentication` y verifica en el servidor.
 * Devuelve `{ ok, redirect? }` sin navegar: el llamador decide
 * (el login normal redirige, el modal de reserva se queda en la página).
 */
"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import { useState } from "react";

import type { Locale } from "@/types";

export type PasskeyLoginError = "unsupported" | "none" | "failed";

export function usePasskeyLogin() {
  const [busy, setBusy] = useState(false);

  async function login(
    email: string,
    locale: Locale,
  ): Promise<
    | { ok: true; redirect: string }
    | { ok: false; error: PasskeyLoginError }
  > {
    setBusy(true);
    try {
      if (!browserSupportsWebAuthn()) {
        return { ok: false, error: "unsupported" };
      }
      const optsRes = await fetch("/api/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const options = (await optsRes.json().catch(() => null)) as {
        error?: string;
        challenge?: string;
      } | null;
      if (!optsRes.ok || !options || options.error || !options.challenge) {
        return {
          ok: false,
          error: options?.error === "no-credentials" ? "none" : "failed",
        };
      }
      let credential;
      try {
        credential = await startAuthentication({
          optionsJSON: options as unknown as Parameters<
            typeof startAuthentication
          >[0]["optionsJSON"],
        });
      } catch {
        return { ok: false, error: "failed" };
      }
      const verRes = await fetch("/api/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credential, locale }),
      });
      const ver = (await verRes.json().catch(() => null)) as {
        ok?: boolean;
        redirect?: string;
      } | null;
      if (!verRes.ok || !ver?.ok || !ver.redirect) {
        return { ok: false, error: "failed" };
      }
      return { ok: true, redirect: ver.redirect };
    } finally {
      setBusy(false);
    }
  }

  return { busy, login };
}
