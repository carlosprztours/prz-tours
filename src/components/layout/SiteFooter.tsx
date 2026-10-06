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
