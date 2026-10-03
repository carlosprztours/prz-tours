/**
 * Cabecera del sitio (Server Component).
 *
 * Fija arriba, con el logo, la navegación principal, el selector de idioma,
 * el teléfono y el CTA de reserva. El menú móvil es un componente de cliente
 * aparte (`MobileMenu`).
 */
import Image from "next/image";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/dal";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";

type Props = {
  locale: Locale;
  dict: Dictionary;
  phoneDisplay: string;
};

export function SiteHeader({ locale, dict, phoneDisplay }: Props) {
  return <SiteHeaderInner locale={locale} dict={dict} phoneDisplay={phoneDisplay} />;
}

async function SiteHeaderInner({ locale, dict, phoneDisplay }: Props) {
  const session = await getCurrentUser().catch(() => null);
  const base = `/${locale}`;
  const links = [
    { href: `${base}/tours`, label: dict.nav.tours },
    { href: `${base}/transfers`, label: dict.nav.transfers },
    { href: `${base}/about`, label: dict.nav.about },
    { href: `${base}/contact`, label: dict.nav.contact },
  ];
  const accountLink = session
    ? { href: `${base}/account`, label: dict.nav.myAccount }
    : { href: `${base}/login`, label: dict.nav.signIn };

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-white/90 backdrop-blur">
      <div className="container-site relative flex h-[72px] items-center justify-between gap-3">
        <Link href={base} className="flex items-center gap-2.5">
          <Image
            src="/img/logo.jpg"
            alt={dict.meta.siteName}
            width={120}
            height={48}
            className="h-11 w-auto rounded-lg object-cover"
            priority
          />
          <span className="hidden font-display text-lg font-bold leading-tight text-ink-900 sm:block">
            Perez Tours
            <span className="block text-xs font-medium text-ocean-600">
              Puerto Plata
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={dict.nav.menu}>
          <Link
            href={base}
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 hover:text-ocean-700"
          >
            {dict.nav.home}
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 hover:text-ocean-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={dict.nav.switchLanguage} />
          <a
            href={`tel:${phoneDisplay.replace(/\D/g, "")}`}
            className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-bold text-ocean-700 transition hover:bg-ocean-50 md:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5C3 4.1 4.1 3 5.5 3h2L9.5 8 7.5 9.5a12 12 0 0 0 7 7L16 14.5l5 2v2c0 1.4-1.1 2.5-2.5 2.5C10.4 21 3 13.6 3 5.5z" />
            </svg>
            {phoneDisplay}
          </a>
          <Link
            href={`${base}/tours`}
            className="hidden h-10 items-center rounded-full bg-coral-700 px-5 text-sm font-bold text-white shadow-lg shadow-coral-500/30 transition hover:bg-coral-800 lg:inline-flex"
          >
            {dict.nav.bookNow}
          </Link>
          <Link
            href={accountLink.href}
            className="hidden h-10 items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 text-sm font-bold text-ink-700 transition hover:border-ocean-300 hover:text-ocean-700 sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" />
              <path strokeLinecap="round" d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
            </svg>
            {session ? session.user.name.split(" ")[0] : accountLink.label}
          </Link>
          <MobileMenu
            locale={locale}
            dict={dict.nav}
            links={[{ href: base, label: dict.nav.home }, ...links, accountLink]}
            bookHref={`${base}/tours`}
          />
        </div>
      </div>
    </header>
  );
}
