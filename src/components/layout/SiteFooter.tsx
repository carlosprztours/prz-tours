/**
 * Pie del sitio (Server Component).
 *
 * Marca, enlaces rápidos, tours populares y datos de contacto.
 */
import Image from "next/image";
import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";

import { CookiePrefsButton } from "./CookiePrefsButton";

type Props = {
  locale: Locale;
  dict: Dictionary;
  settings: {
    phoneDisplay: string;
    email: string;
    address: string;
    hours: string;
    instagram: string;
    facebook: string;
    tiktok: string;
  };
  popularTours: { slug: string; title: string }[];
};

export function SiteFooter({ locale, dict, settings, popularTours }: Props) {
  const base = `/${locale}`;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ocean-950 text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/img/logo.png"
              alt={dict.meta.siteName}
              width={220}
              height={240}
              className="h-20 w-auto object-contain rounded-lg bg-white p-1"
            />
            <p className="font-display text-xl font-bold leading-tight">
              Perez Tours
              <span className="block text-xs font-medium text-ocean-200">
                {dict.meta.tagline}
              </span>
            </p>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ocean-100/80">
            {dict.meta.defaultDescription}
          </p>
        </div>

        <nav aria-label={dict.footer.quickLinks}>
          <p className="font-display text-sm font-bold uppercase tracking-wider text-ocean-200">
            {dict.footer.quickLinks}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: `${base}/tours`, label: dict.nav.tours },
              { href: `${base}/transfers`, label: dict.nav.transfers },
              { href: `${base}/book?type=custom`, label: dict.booking.customTitle },
              { href: `${base}/track`, label: dict.nav.trackBooking },
              { href: `${base}/about`, label: dict.nav.about },
              { href: `${base}/contact`, label: dict.nav.contact },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/85 transition hover:text-white hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={dict.nav.tours}>
          <p className="font-display text-sm font-bold uppercase tracking-wider text-ocean-200">
            {dict.nav.tours}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {popularTours.slice(0, 5).map((tour) => (
              <li key={tour.slug}>
                <Link
                  href={`${base}/tours/${tour.slug}`}
                  className="text-white/85 transition hover:text-white hover:underline"
                >
                  {tour.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wider text-ocean-200">
            {dict.footer.contactUs}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/85">
            <li>{settings.address}</li>
            <li>
              <a href={`tel:${settings.phoneDisplay.replace(/\D/g, "")}`} className="transition hover:text-white hover:underline">
                {settings.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${settings.email}`} className="transition hover:text-white hover:underline">
                {settings.email}
              </a>
            </li>
            <li className="text-white/70">{settings.hours}</li>
            <li className="flex gap-3 mt-3">
              <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition" aria-label="Instagram">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition" aria-label="Facebook">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition" aria-label="TikTok">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/60 sm:flex-row">
          <p>
            © {year} {dict.meta.siteName}. {dict.footer.rights}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href={`${base}/aviso-legal`} className="hover:text-white hover:underline">
              {locale === "es" ? "Aviso legal" : "Legal notice"}
            </Link>
            <Link href={`${base}/privacidad`} className="hover:text-white hover:underline">
              {locale === "es" ? "Privacidad" : "Privacy"}
            </Link>
            <Link href={`${base}/cookies`} className="hover:text-white hover:underline">
              {locale === "es" ? "Cookies" : "Cookies"}
            </Link>
            <CookiePrefsButton locale={locale} />
          </div>
          <p>{dict.footer.builtWith}</p>
        </div>
      </div>
    </footer>
  );
}
