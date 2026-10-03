/**
 * Pie del sitio (Server Component).
 *
 * Marca, enlaces rápidos, tours populares y datos de contacto.
 */
import Image from "next/image";
import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import type { Locale, TourWithContent } from "@/types";

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
  popularTours: Pick<TourWithContent, "slug" | "translation">[];
};

export function SiteFooter({ locale, dict, settings, popularTours }: Props) {
  const base = `/${locale}`;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ocean-950 text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/img/logo.jpg"
              alt={dict.meta.siteName}
              width={120}
              height={48}
              className="h-11 w-auto rounded-lg object-cover"
            />
            <p className="font-display text-lg font-bold leading-tight">
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
              { href: `${base}/track`, label: locale === "es" ? "Mi reserva" : "My booking" },
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
                  {tour.translation.title}
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
          <p>{dict.footer.builtWith}</p>
        </div>
      </div>
    </footer>
  );
}
