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
              <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition" aria-label="Facebook">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition" aria-label="TikTok">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12.548.655a12.497 12.497 0 0 0-4.288 1.7 12.46 12.46 0 0 0-3.53 5.042 12.492 12.492 0 0 0-.49 5.068c0 4.398 2.372 8.3 5.848 10.325a12.493 12.493 0 0 0 7.942-4.003 13.508 13.508 0 0 0 2.357-6.145 13.5 13.5 0 0 0 .17-1.92c-.25-3.084-1.524-5.81-3.85-7.85a12.552 12.552 0 0 0-3.665-1.519 12.484 12.484 0 0 0-4.508 1.31 12.5 12.5 0 0 0-3.66 3.798 12.535 12.535 0 0 0-1.305 4.6c0 3.56 1.874 6.73 4.836 8.58a12.495 12.495 0 0 0 12.127-4.398 12.525 12.525 0 0 0 1.532-6.47 12.493 12.493 0 0 0-4.85-3.997c-.76-.052-1.547-.07-2.32-.07-3.34 0-6.045 2.068-7.077 5.13a12.47 12.47 0 0 0-1.5 6.57c0 2.757 1.45 5.2 3.795 6.537a12.5 12.5 0 0 0 6.578 1.762c.095-.349.19-.728.285-1.105.327-1.232.767-2.362 1.235-3.45.078-.18.18-.38.225-.56.02-.107.037-.21.037-.338 0-.436-.064-.887-.162-1.31-.183-.81-.424-1.62-.795-2.35a11.34 11.34 0 0 0-1.17-2.107c-1.3-.974-3.166-1.172-4.536-.597l-3.255 1.32a.628.628 0 0 1-.765-.626v-3.57c0-.218.007-.435.017-.646C15.63 8.333 16.95 5.01 18.988 2.99a12.488 12.488 0 0 0-6.44-2.335z"/></svg>
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
