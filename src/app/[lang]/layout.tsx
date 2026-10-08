/**
 * Layout de idioma: valida el locale, carga ajustes + tours populares una
 * sola vez y monta header, botón de WhatsApp y footer en todas las páginas
 * públicas.
 *
 * Las rutas del panel (`/[lang]/admin/...`) usan su propio layout anidado
 * sin header/footer públicos.
 */
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { ConditionalFloat } from "@/components/layout/ConditionalFloat";
import { ChromeSwitcher } from "@/components/layout/ChromeSwitcher";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSetting } from "@/lib/db/content";
import { getPromptFlags, hasSubscription } from "@/lib/db/push";
import { listTourNavItems } from "@/lib/db/tours";
import { getDictionary, isLocale } from "@/lib/i18n";
import { DEFAULT_EMAIL, DEFAULT_PHONE_DISPLAY, DEFAULT_WHATSAPP } from "@/lib/site";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, navTours] = await Promise.all([
    getDictionary(lang),
    listTourNavItems(lang),
  ]);

  const [phoneDisplay, email, address, hours, whatsapp, instagram, facebook, tiktok] =
    await Promise.all([
      getSetting("phone_display", DEFAULT_PHONE_DISPLAY),
      getSetting("email", DEFAULT_EMAIL),
      getSetting("address", "Puerto Plata, República Dominicana"),
      getSetting(`hours_${lang}`, lang === "es" ? "Lun – Sáb · 7:00 AM – 8:00 PM" : "Mon – Sat · 7:00 AM – 8:00 PM"),
      getSetting("whatsapp", DEFAULT_WHATSAPP),
      getSetting("instagram", "https://instagram.com/pereztours"),
      getSetting("facebook", "https://www.facebook.com/profile.php?id=61556984834291"),
      getSetting("tiktok", "https://www.tiktok.com/@pereztoursandtransfer"),
    ]);

  // Aviso de instalar la PWA / activar notificaciones: solo para clientes con
  // sesión y solo mientras no lo hayan aceptado o descartado.
  const session = await getCurrentUser().catch(() => null);
  let pwaPrompt: { alreadyInstalled: boolean; alreadySubscribed: boolean } | null = null;
  if (session && session.user.role === "customer") {
    const [flags, subscribed] = await Promise.all([
      getPromptFlags(session.user.id),
      hasSubscription(session.user.id),
    ]);
    if (!flags.installSeen || !flags.notifySeen) {
      pwaPrompt = { alreadyInstalled: flags.installAccepted, alreadySubscribed: subscribed };
    }
  }

  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="preload" as="image" href="/img/hero/hero-1.jpg" />
      </head>
      <body>
        <ChromeSwitcher
      header={
        <>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ocean-700 focus:px-5 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
          >
            {dict.common.skipToContent}
          </a>
          <SiteHeader locale={lang} dict={dict} />
          <ConditionalFloat phone={whatsapp} texts={dict.whatsapp} />
          {pwaPrompt && (
            <PwaInstallPrompt
              labels={dict.pwa}
              alreadyInstalled={pwaPrompt.alreadyInstalled}
              alreadySubscribed={pwaPrompt.alreadySubscribed}
            />
          )}
          <CookieBanner locale={lang} />
        </>
      }
      footer={
        <SiteFooter
          locale={lang}
          dict={dict}
          settings={{
            phoneDisplay,
            email,
            address,
            hours,
            instagram,
            facebook,
            tiktok,
          }}
          popularTours={navTours}
        />
      }
    >
      {children}
    </ChromeSwitcher>
  </body>
</html>
);
}
