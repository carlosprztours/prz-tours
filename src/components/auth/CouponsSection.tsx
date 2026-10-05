/**
 * Cupones de la cuenta (componente de cliente, solo lectura).
 *
 * Muestra los cupones personales activos con su código listo para copiar,
 * más el historial de usados.
 */
"use client";

import { useState } from "react";

import type { Coupon } from "@/lib/db/loyalty";

export function CouponsSection({
  coupons,
  labels,
}: {
  coupons: Coupon[];
  labels: {
    title: string;
    subtitle: string;
    copy: string;
    copied: string;
    empty: string;
    expires: string;
    usedOn: string;
    statusUsed: string;
    statusExpired: string;
  };
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
  }

  const discountText = (c: Coupon) =>
    c.kind === "percent" ? `${c.value} %` : `$${c.value}`;

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink-900">
        {labels.title}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>

      {coupons.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">{labels.empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {coupons.map((c) => (
            <li
              key={c.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${
                c.status === "active" ? "bg-emerald-50" : "bg-sand-50/60"
              }`}
            >
              <div className="min-w-0">
                <p className="font-mono text-lg font-extrabold tracking-widest text-ink-900">
                  {c.code}
                </p>
                <p className="text-xs text-ink-500">
                  {discountText(c)} ·{" "}
                  {c.status === "active"
                    ? `${labels.expires} ${c.expires_at?.slice(0, 10) ?? "—"}`
                    : c.status === "used"
                      ? `${labels.statusUsed}${c.used_at ? ` · ${c.used_at.slice(0, 10)}` : ""}`
                      : labels.statusExpired}
                </p>
              </div>
              {c.status === "active" ? (
                <button
                  type="button"
                  onClick={() => copy(c.code)}
                  className="inline-flex h-9 items-center rounded-full bg-ocean-700 px-5 text-xs font-bold text-white transition hover:bg-ocean-800"
                >
                  {copied === c.code ? labels.copied : labels.copy}
                </button>
              ) : (
                <span className="text-xs font-bold uppercase text-ink-500">
                  {c.status === "used" ? labels.statusUsed : labels.statusExpired}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
