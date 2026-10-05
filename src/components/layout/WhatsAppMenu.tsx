/**
 * Menú flotante de WhatsApp (componente de cliente).
 *
 * En vez de ir directo al chat, abre un menú con el motivo del contacto
 * (duda, confirmación, reserva, chofer). Cada opción abre WhatsApp con un
 * mensaje pre-escrito distinto para que el equipo sepa de qué viene el
 * cliente. La opción de confirmar pide la referencia.
 */
"use client";

import { useState } from "react";

import type { Dictionary } from "@/lib/i18n";
import { normalizeWhatsappNumber } from "@/lib/notify/whatsapp";

type Props = {
  phone: string;
  texts: Dictionary["whatsapp"];
};

function link(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsappNumber(phone)}?text=${encodeURIComponent(message)}`;
}

const panelBtn =
  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-ink-900 transition hover:bg-sand-100";

export function WhatsAppMenu({ phone, texts }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [mine, setMine] = useState<
    { reference: string; title: string; booked_for: string | null }[] | null
  >(null);

  // Al abrir "confirmar", trae las reservas del usuario: con una se
  // autorrellena; con varias se elige; sin sesión sigue el campo manual.
  async function toggleConfirm() {
    const next = !confirmOpen;
    setConfirmOpen(next);
    if (next && mine === null) {
      try {
        const res = await fetch("/api/bookings/mine", { cache: "no-store" });
        const data = (await res.json()) as {
          bookings: { reference: string; title: string; booked_for: string | null }[];
        };
        const list = data.bookings ?? [];
        setMine(list);
        if (list.length === 1) setReference(list[0].reference);
      } catch {
        setMine([]);
      }
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          role="menu"
          aria-label={texts.label}
          className="w-72 overflow-hidden rounded-2xl border border-sand-200 bg-white p-2 shadow-2xl"
        >
          <p className="px-4 pb-1 pt-2 text-xs font-extrabold uppercase tracking-wider text-ink-500">
            {texts.menuTitle}
          </p>
          <a
            role="menuitem"
            href={link(phone, texts.optQuestionMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className={panelBtn}
          >
            <span aria-hidden="true">❓</span> {texts.optQuestion}
          </a>

          <button
            type="button"
            role="menuitem"
            aria-expanded={confirmOpen}
            onClick={toggleConfirm}
            className={panelBtn}
          >
            <span aria-hidden="true">✅</span> {texts.optConfirm}
          </button>
          {confirmOpen && (
            <span className="grid gap-2 px-2 pb-2">
              {mine === null ? (
                <span className="px-2 py-1 text-xs text-ink-500">{texts.optConfirmLoading}</span>
              ) : (
                mine.length > 0 && (
                  <span>
                    <span className="block px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                      {texts.optConfirmMine}
                    </span>
                    {mine.map((b) => (
                      <button
                        key={b.reference}
                        type="button"
                        onClick={() => setReference(b.reference)}
                        aria-pressed={reference === b.reference}
                        className={`mb-1 flex w-full flex-col rounded-xl px-3 py-2 text-left text-xs transition ${
                          reference === b.reference
                            ? "bg-ocean-600 font-bold text-white"
                            : "bg-sand-50 font-semibold text-ink-700 hover:bg-sand-100"
                        }`}
                      >
                        <span className="font-mono">{b.reference}</span>
                        <span className="truncate font-sans font-medium opacity-80">
                          {b.title}
                          {b.booked_for ? ` · ${b.booked_for}` : ""}
                        </span>
                      </button>
                    ))}
                    <span className="block px-2 pb-1 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                      {texts.optConfirmManual}
                    </span>
                  </span>
                )
              )}
              <span className="flex gap-2">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  placeholder={texts.optConfirmPlaceholder}
                  aria-label={texts.optConfirm}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-sand-200 px-3 font-mono text-sm uppercase outline-none focus:border-ocean-500"
                />
                <a
                  href={link(phone, `${texts.optConfirmMessage} ${reference.trim() || texts.optConfirmPlaceholder}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#25d366] px-4 text-sm font-bold text-white"
                >
                  {texts.optConfirmGo}
                </a>
              </span>
            </span>
          )}

          <a
            role="menuitem"
            href={link(phone, texts.optBookMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className={panelBtn}
          >
            <span aria-hidden="true">🎫</span> {texts.optBook}
          </a>
          <a
            role="menuitem"
            href={link(phone, texts.optDriverMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className={panelBtn}
          >
            <span aria-hidden="true">🚐</span> {texts.optDriver}
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={texts.label}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-black/20 transition hover:scale-105 hover:bg-[#1fb857]"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm-3.2 3.5c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 3 4.7 4 .6.3 1.1.4 1.5.6.6.2 1.2.1 1.6-.2.5-.3 1-1.3 1.1-1.7.1-.4.1-.8 0-.9l-.3-.2-1.9-.9c-.2-.1-.4 0-.6.2l-.8 1c-.1.2-.3.2-.5.1a7.5 7.5 0 0 1-2.2-1.3 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.4.1-.6L9.4 6c-.1-.3-.4-.5-.6-.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
