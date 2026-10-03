/**
 * Botón hamburguesa + panel móvil del header (componente de cliente).
 *
 * El header es Server Component; solo la interacción del menú vive aquí.
 */
"use client";

import { useState } from "react";
import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  locale: Locale;
  dict: Dictionary["nav"];
  links: { href: string; label: string }[];
  bookHref: string;
};

export function MobileMenu({ locale, dict, links, bookHref }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? dict.closeMenu : dict.openMenu}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-900 transition hover:bg-sand-100"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-t border-sand-200 bg-white/95 shadow-xl backdrop-blur">
          <nav className="container-site flex flex-col gap-1 py-4" aria-label={dict.menu}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-display text-lg font-semibold text-ink-900 transition hover:bg-sand-100"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={bookHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-xl bg-coral-500 px-4 py-3 text-center font-display text-lg font-bold text-white shadow-lg shadow-coral-500/30 transition hover:bg-coral-600"
            >
              {dict.bookNow}
            </Link>
            <p className="px-4 pt-2 text-sm text-ink-500">
              {locale === "es" ? "Puerto Plata · República Dominicana" : "Puerto Plata · Dominican Republic"}
            </p>
          </nav>
        </div>
      )}
    </div>
  );
}
