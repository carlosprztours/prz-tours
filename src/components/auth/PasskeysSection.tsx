/**
 * Gestión de passkeys en "Mi cuenta" (componente de cliente).
 *
 * - Lista los autenticadores registrados con opción de eliminar.
 * - "Agregar" pide las opciones al servidor, abre el diálogo del
 *   dispositivo (huella, Face ID o PIN) con `startRegistration` y guarda
 *   la credencial verificada. Luego refresca la página.
 */
"use client";

import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PasskeyLabels = {
  title: string;
  subtitle: string;
  add: string;
  adding: string;
  devicePlaceholder: string;
  remove: string;
  empty: string;
  errors: {
    failed: string;
    duplicate: string;
    unsupported: string;
  };
};

export function PasskeysSection({
  credentials,
  labels,
}: {
  credentials: { id: number; device_name: string; created_at: string }[];
  labels: PasskeyLabels;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      if (!browserSupportsWebAuthn()) {
        setError(labels.errors.unsupported);
        return;
      }
      const optsRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
      });
      if (!optsRes.ok) throw new Error("options");
      const credential = await startRegistration({
        optionsJSON: await optsRes.json(),
      });
      const verRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, deviceName: name }),
      });
      const ver = (await verRes.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!verRes.ok) {
        setError(
          ver?.error === "duplicate"
            ? labels.errors.duplicate
            : labels.errors.failed,
        );
        return;
      }
      setName("");
      router.refresh();
    } catch {
      setError(labels.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setError(null);
    try {
      const res = await fetch("/api/webauthn/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete");
      router.refresh();
    } catch {
      setError(labels.errors.failed);
    }
  }

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">
        {labels.title}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>

      {credentials.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-sand-50/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">
                  {c.device_name || "Passkey"}
                </p>
                <p className="text-xs text-ink-500">{c.created_at}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
              >
                {labels.remove}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-500">{labels.empty}</p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.devicePlaceholder}
          maxLength={80}
          className="h-11 flex-1 rounded-xl border border-sand-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-500/60 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center rounded-full bg-ocean-700 px-6 text-sm font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
        >
          {busy ? labels.adding : labels.add}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
