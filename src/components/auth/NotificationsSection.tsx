/**
 * Avisos de la cuenta (componente de cliente).
 *
 * Lista los avisos (pagos, confirmaciones, cupones) con botón para
 * marcarlos todos como leídos.
 */
"use client";

import { useState } from "react";

import type { Notification } from "@/lib/db/loyalty";

export function NotificationsSection({
  initial,
  labels,
}: {
  initial: Notification[];
  labels: {
    title: string;
    empty: string;
    markAll: string;
  };
}) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function markAll() {
    setBusy(true);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } finally {
      setBusy(false);
    }
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink-900">
          {labels.title}
          {unread > 0 && (
            <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-coral-700 px-2 text-xs font-bold text-white">
              {unread}
            </span>
          )}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            disabled={busy}
            className="shrink-0 text-xs font-bold text-ocean-700 hover:underline disabled:opacity-60"
          >
            {labels.markAll}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">{labels.empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl px-4 py-3 ${n.is_read ? "bg-sand-50/60" : "bg-ocean-50"}`}
            >
              <p className="text-sm font-bold text-ink-900">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs text-ink-600">{n.body}</p>}
              <p className="mt-1 text-[11px] text-ink-500">{n.created_at}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
