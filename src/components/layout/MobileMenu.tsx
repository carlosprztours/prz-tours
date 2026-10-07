/**
 * Botón hamburguesa + panel desplegable del header (componente de cliente).
 *
 * Está visible en todas las medidas: además de la navegación, el panel
 * contiene el cambio de idioma (ES/EN), que es su único punto de acceso.
 * El header es Server Component; solo la interacción del menú vive aquí.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { locales } from "@/lib/i18n/config";
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
  const pathname = usePathname();

  // Cambiar el prefijo de idioma en la URL manteniendo la misma página.
  const langTarget = (target: Locale) => {
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = target;
      return segments.join("/") || "/";
    }
    return `/${target}`;
  };
  const esTarget = langTarget("es");
  const enTarget = langTarget("en");

  // Si se abre y el usuario desliza, el menú se cierra solo: no debe
  // quedar flotando sobre el contenido ni pelear con el header.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <div>
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
        <div className="absolute inset-x-0 top-full border-t border-sand-200 bg-white shadow-xl">
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
              className="mt-2 rounded-xl bg-coral-700 px-4 py-3 text-center font-display text-lg font-bold text-white shadow-lg shadow-coral-500/30 transition hover:bg-coral-800"
            >
              {dict.bookNow}
            </Link>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-sand-50 px-4 py-3">
              <span className="text-sm font-bold text-ink-700">{dict.switchLanguage}</span>
              <div className="flex overflow-hidden rounded-full border border-sand-200 bg-white text-xs font-bold">
                <Link
                  href={esTarget}
                  onClick={() => setOpen(false)}
                  aria-current={locale === "es" ? "page" : undefined}
                  className={`px-3 py-1.5 transition ${
                    locale === "es"
                      ? "bg-ocean-700 text-white"
                      : "bg-white text-ink-600 hover:text-ocean-700"
                  }`}
                >
                  ES
                </Link>
                <Link
                  href={enTarget}
                  onClick={() => setOpen(false)}
                  aria-current={locale === "en" ? "page" : undefined}
                  className={`px-3 py-1.5 transition ${
                    locale === "en"
                      ? "bg-ocean-700 text-white"
                      : "bg-white text-ink-600 hover:text-ocean-700"
                  }`}
                >
                  EN
                </Link>
              </div>
            </div>
            <p className="px-4 pt-2 text-sm text-ink-500">
              {locale === "es" ? "Puerto Plata · República Dominicana" : "Puerto Plata · Dominican Republic"}
            </p>
          </nav>
        </div>
      )}
    </div>
  );
}
