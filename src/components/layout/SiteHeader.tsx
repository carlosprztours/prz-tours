/**
 * Cabecera del sitio (Server Component).
 *
 * Fija arriba:
 * - Escritorio (lg+): una fila con logo + navegación (Inicio, Galería,
 *   Nosotros, Contacto) a la izquierda; a la derecha los botones destacados
 *   Tours | Traslados junto a la campana, el idioma y el CTA de reserva.
 * - Móvil: fila superior (burger, logo, campana, cuenta) + una fila inferior
 *   con "Tours" y "Traslados" como botones a lo ancho; el idioma pasa al
 *   menú hamburguesa.
 *
 * El botón de WhatsApp del header se retiró: el botón flotante
 * (`ConditionalFloat`) ya cubre esa acción en todas las páginas.
 */
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/dal";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";
import { HeaderMiniLogo } from "./HeaderMiniLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { NotificationsBell } from "./NotificationsBell";

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function SiteHeader({ locale, dict }: Props) {
  return <SiteHeaderInner locale={locale} dict={dict} />;
}

const CompassIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 8.5-2.2 5-5 2.2 2.2-5 5-2.2z" />
  </svg>
);

const TransferIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3l4 4-4 4M14 7h7M7 21l-4-4 4-4M10 17H3" />
  </svg>
);

const UserIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path strokeLinecap="round" d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
  </svg>
);

async function SiteHeaderInner({ locale, dict }: Props) {
  const session = await getCurrentUser().catch(() => null);
  const base = `/${locale}`;
  const navLinks = [
    { href: `${base}/gallery`, label: dict.nav.gallery },
    { href: `${base}/about`, label: dict.nav.about },
    { href: `${base}/contact`, label: dict.nav.contact },
  ];
  const accountLink = session
    ? { href: `${base}/account`, label: dict.nav.myAccount }
    : { href: `${base}/login`, label: dict.nav.signIn };
  const menuLinks = [
    { href: base, label: dict.nav.home },
    { href: `${base}/tours`, label: dict.nav.tours },
    { href: `${base}/transfers`, label: dict.nav.transfers },
    ...navLinks,
    accountLink,
  ];

  const toursButtonClass =
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-ocean-200 bg-ocean-50 px-4 text-sm font-bold text-ocean-800 transition hover:border-ocean-400 hover:bg-ocean-100";
  const transfersButtonClass =
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 text-sm font-bold text-ink-700 transition hover:border-ocean-300 hover:text-ocean-700";

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-white/90 backdrop-blur">
      <div className="container-site py-2 lg:flex lg:h-24 lg:items-center lg:justify-between lg:gap-4 lg:py-0">
        {/* Fila 1 (móvil) / bloque izquierdo (escritorio): burger + logo + nav */}
        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          <MobileMenu
            locale={locale}
            dict={dict.nav}
            links={menuLinks}
            bookHref={`${base}/tours`}
          />
          <HeaderMiniLogo href={base} siteName={dict.meta.siteName} />
          <nav className="hidden items-center gap-1 lg:flex" aria-label={dict.nav.menu}>
            <Link
              href={base}
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 hover:text-ocean-700"
            >
              {dict.nav.home}
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 hover:text-ocean-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Cluster derecho: Tours | Traslados · campana · idioma · Reservar · Cuenta */}
        <div className="mt-2 flex items-center justify-between gap-1.5 lg:mt-0 lg:justify-end lg:gap-2">
          <div className="hidden items-center gap-1.5 lg:flex">
            <Link href={`${base}/tours`} className={toursButtonClass}>
              {CompassIcon}
              {dict.nav.tours}
            </Link>
            <Link href={`${base}/transfers`} className={transfersButtonClass}>
              {TransferIcon}
              {dict.nav.transfers}
            </Link>
          </div>
          <NotificationsBell labels={dict.notify} accountHref={`${base}/account`} />
          <LanguageSwitcher
            locale={locale}
            label={dict.nav.switchLanguage}
            className="hidden lg:inline-flex"
          />
          <Link
            href={`${base}/tours`}
            className="hidden h-10 items-center rounded-full bg-coral-700 px-5 text-sm font-bold text-white shadow-lg shadow-coral-500/30 transition hover:bg-coral-800 lg:inline-flex"
          >
            {dict.nav.bookNow}
          </Link>
          <Link
            href={accountLink.href}
            aria-label={accountLink.label}
            className="hidden h-10 items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 text-sm font-bold text-ink-700 transition hover:border-ocean-300 hover:text-ocean-700 sm:inline-flex"
          >
            {UserIcon}
            <span className="hidden xl:inline">
              {session ? session.user.name.split(" ")[0] : accountLink.label}
            </span>
          </Link>
        </div>
      </div>

      {/* Fila móvil: Tours | Traslados a lo ancho */}
      <div className="container-site grid grid-cols-2 gap-2 pb-2 lg:hidden">
        <Link
          href={`${base}/tours`}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-ocean-200 bg-ocean-50 text-sm font-bold text-ocean-800 transition hover:bg-ocean-100"
        >
          {CompassIcon}
          {dict.nav.tours}
        </Link>
        <Link
          href={`${base}/transfers`}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-sand-200 bg-white text-sm font-bold text-ink-700 transition hover:border-ocean-300 hover:text-ocean-700"
        >
          {TransferIcon}
          {dict.nav.transfers}
        </Link>
      </div>
    </header>
  );
}