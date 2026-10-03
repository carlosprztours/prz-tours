/**
 * Contacto: datos + formulario.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/contact/ContactForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getSetting } from "@/lib/db/content";
import { getDictionary, isLocale } from "@/lib/i18n";
import { DEFAULT_EMAIL, DEFAULT_PHONE_DISPLAY, DEFAULT_WHATSAPP } from "@/lib/site";
import { whatsappLink } from "@/lib/notify/whatsapp";
import type { Locale } from "@/types";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.contact.title,
    description: dict.contact.subtitle,
    alternates: {
      canonical: `/${lang}/contact`,
      languages: { es: "/es/contact", en: "/en/contact" },
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const [dict, phoneDisplay, email, address, hours, whatsapp] = await Promise.all([
    getDictionary(locale),
    getSetting("phone_display", DEFAULT_PHONE_DISPLAY),
    getSetting("email", DEFAULT_EMAIL),
    getSetting("address", "Puerto Plata, República Dominicana"),
    getSetting("hours", "Lun – Sáb · 7:00 AM – 8:00 PM"),
    getSetting("whatsapp", DEFAULT_WHATSAPP),
  ]);

  const cards = [
    { title: dict.contact.addressTitle, value: address, href: undefined },
    { title: dict.contact.phoneTitle, value: phoneDisplay, href: `tel:${phoneDisplay.replace(/\D/g, "")}` },
    { title: dict.contact.whatsappTitle, value: phoneDisplay, href: whatsappLink(whatsapp, dict.whatsapp.defaultMessage) },
    { title: dict.contact.emailTitle, value: email, href: `mailto:${email}` },
    { title: dict.contact.hoursTitle, value: hours, href: undefined },
  ];

  return (
    <div className="bg-sand-50/50 py-12 sm:py-16">
      <div className="container-site">
        <SectionHeading title={dict.contact.title} subtitle={dict.contact.subtitle} />

        <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid content-start gap-3">
            {cards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-sand-200 bg-white p-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ocean-700">
                  {card.title}
                </p>
                {card.href ? (
                  <a href={card.href} target={card.href.startsWith("http") ? "_blank" : undefined} rel={card.href.startsWith("http") ? "noopener noreferrer" : undefined} className="mt-1 block font-display text-base font-bold text-ink-900 hover:text-ocean-700 hover:underline">
                    {card.value}
                  </a>
                ) : (
                  <p className="mt-1 font-display text-base font-bold text-ink-900">{card.value}</p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-sand-200 bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-extrabold text-ink-900">{dict.contact.formTitle}</h2>
            <p className="mb-5 mt-1 text-sm text-ink-500">{dict.contact.formSubtitle}</p>
            <ContactForm locale={locale} contact={dict.contact} />
          </div>
        </div>
      </div>
    </div>
  );
}
