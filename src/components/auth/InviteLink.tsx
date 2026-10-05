/**
 * Enlace de invitado (componente de cliente).
 *
 * Muestra el enlace personal (`/signup?ref=CODIGO`) con botón de copiar.
 * Quien se registre con él recibe un 10 % de un solo uso.
 */
"use client";

import { useState } from "react";

import type { Locale } from "@/types";

export function InviteLink({
  locale,
  code,
  labels,
}: {
  locale: Locale;
  code: string;
  labels: {
    title: string;
    subtitle: string;
    copy: string;
    copied: string;
  };
}) {
  const [copied, setCopied] = useState(false);
  const path = `/${locale}/signup?ref=${code}`;

  async function copy() {
    const absolute = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(absolute);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = absolute;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">
        {labels.title}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          readOnly
          value={path}
          onFocus={(e) => e.target.select()}
          className="h-11 flex-1 rounded-xl border border-sand-200 bg-sand-50/60 px-4 font-mono text-sm text-ink-700 outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 items-center justify-center rounded-full bg-ocean-700 px-6 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </section>
  );
}
