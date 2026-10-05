/**
 * Campana de avisos del header (componente de cliente).
 *
 * Muestra el conteo de no leídos y un desplegable con los últimos avisos.
 * Al abrirlo los marca como leídos. Si no hay sesión, no se muestra.
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Notification } from "@/lib/db/loyalty";

export function NotificationsBell({
  labels,
  accountHref,
}: {
  labels: { title: string; empty: string; viewAll: string };
  accountHref: string;
}) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [logged, setLogged] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await res.json()) as {
        logged: boolean;
        unread: number;
        items: Notification[];
      };
      if (!data.logged) {
        setLogged(false);
        return;
      }
      setUnread(data.unread ?? 0);
      setItems(data.items ?? []);
      setLogged(true);
    } catch {
      /* sin sesión o sin red: se oculta */
    }
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        const parsed = data as {
          logged: boolean;
          unread: number;
          items: Notification[];
        };
        if (!parsed.logged) return;
        setUnread(parsed.unread ?? 0);
        setItems(parsed.items ?? []);
        setLogged(true);
      })
      .catch(() => {
        /* sin sesión o sin red: se oculta */
      });
    const onFocus = () => {
      load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open ]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      }).catch(() => {});
    }
  }

  // Sin sesión no hay nada que mostrar.
  if (!logged) return null;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={labels.title}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand-200 bg-white text-ink-700 transition hover:border-ocean-300 hover:text-ocean-700"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-700 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[85vw] rounded-2xl border border-sand-200 bg-white p-2 shadow-2xl">
          <p className="px-3 pb-1 pt-2 font-display text-sm font-bold text-ink-900">
            {labels.title}
          </p>
          {items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-500">{labels.empty}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link ?? accountHref}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 transition hover:bg-sand-100"
                  >
                    <p className="text-sm font-bold text-ink-900">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.body}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={accountHref}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl px-3 py-2 text-center text-xs font-bold text-ocean-700 transition hover:bg-sand-100"
          >
            {labels.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
