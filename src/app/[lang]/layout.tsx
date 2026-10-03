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
import { ConditionalFloat } from "@/components/layout/ConditionalFloat";
import { getSetting } from "@/lib/db/content";
import { listPublishedTours } from "@/lib/db/tours";
import { getDictionary, isLocale } from "@/lib/i18n";
import { DEFAULT_EMAIL, DEFAULT_PHONE_DISPLAY, DEFAULT_WHATSAPP } from "@/lib/site";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, tours] = await Promise.all([
    getDictionary(lang),
    listPublishedTours(lang),
  ]);

  const [phoneDisplay, email, address, hours, whatsapp, waMessage] =
    await Promise.all([
      getSetting("phone_display", DEFAULT_PHONE_DISPLAY),
      getSetting("email", DEFAULT_EMAIL),
      getSetting("address", "Puerto Plata, República Dominicana"),
      getSetting("hours", "Lun – Sáb · 7:00 AM – 8:00 PM"),
      getSetting("whatsapp", DEFAULT_WHATSAPP),
      getSetting("whatsapp_default_message", dict.whatsapp.defaultMessage),
    ]);

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ocean-700 focus:px-5 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {dict.common.skipToContent}
      </a>
      <SiteHeader locale={lang} dict={dict} phoneDisplay={phoneDisplay} />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter
        locale={lang}
        dict={dict}
        settings={{
          phoneDisplay,
          email,
          address,
          hours,
          instagram: "https://instagram.com/pereztours",
          facebook: "https://facebook.com/pereztours",
        }}
        popularTours={tours.slice(0, 5)}
      />
      <ConditionalFloat phone={whatsapp} message={waMessage} label={dict.whatsapp.label} />
    </>
  );
}
