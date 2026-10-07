/**
 * Hero de la home: foto de Cayo Arena, titular, CTAs y estadísticas.
 */
import Image from "next/image";
import Link from "next/link";

import { HeroCarousel } from "@/components/home/HeroCarousel";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  locale: Locale;
  dict: Dictionary;
  stats: { tours: number };
};

export function Hero({ locale, dict, stats }: Props) {
  const base = `/${locale}`;

  const heroSlides = [
    { src: "/img/hero/hero-1.jpg", alt: "Cayo Arena, Paradise Island", caption: "Paradise Island (Cayo Arena) — Aguas cristalinas y arena blanca" },
    { src: "/img/hero/hero-2.jpg", alt: "Cascadas de Damajagua", caption: "Cascadas de Damajagua — Aventura y naturaleza" },
    { src: "/img/hero/hero-3.jpg", alt: "Aventura en ATV", caption: "Aventura en ATV — Diversión extrema por la montaña" },
    { src: "/img/hero/hero-4.jpg", alt: "City Tour Puerto Plata", caption: "City Tour Puerto Plata — Historia y cultura" },
    { src: "/img/hero/hero-5.jpg", alt: "Monkey Jungle", caption: "Monkey Jungle — Encuentro con monos ardilla" },
  ];

  return (
    <section className="relative overflow-hidden bg-ocean-950 text-white">
      <HeroCarousel slides={heroSlides} intervalMs={6000} />

      {/* En móvil el alto útil real es pequeño (barra de direcciones + barra
          de navegación): ~660-730px. Con el hero completo el titular se
          comía la pantalla, el botón «Explorar tours» quedaba fuera de vista y
          el botón flotante de WhatsApp se montaba encima del texto. Por eso
          aquí se compacta con `max-height` y no solo con `sm:`.

          El botón de WhatsApp ocupa la esquina inferior derecha (~120px con los
          dos botones apilados), así que en pantallas bajas además escondemos
          las estadísticas (lo menos importante) para que el titular, los CTA y
          el texto no queden debajo del flotante.

          A 320px de ancho los dos CTA se apilan en dos filas y el segundo
          ("Traslados") quedaba justo bajo el botón de WhatsApp; en pantallas
          tan estrechas se oculta (Traslados sigue en el menú y en su propia
          página). Ojo: `max-[380px]` en Tailwind es de ANCHO; para altura hay
          que escribir la media query entera: `[@media(max-height:700px)]:`. */}
      <div className="container-site relative flex min-h-[480px] flex-col items-center justify-center gap-y-5 py-10 text-center sm:min-h-[600px] sm:gap-y-6 sm:py-16 [@media(max-height:760px)]:min-h-0 [@media(max-height:760px)]:gap-y-3 [@media(max-height:760px)]:pt-4 [@media(max-height:760px)]:pb-32">
        <div
          className="mx-auto w-fit rounded-3xl bg-white/95 px-8 py-6 shadow-2xl backdrop-blur will-change-transform md:px-10 md:py-8"
          id="hero-logo"
        >
          <Image
            src="/img/logo.png"
            alt={dict.meta.siteName}
            width={440}
            height={480}
            className="h-20 w-auto object-contain sm:h-48 md:h-64 [@media(max-height:760px)]:h-20"
            priority
          />
        </div>
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">
          {dict.hero.badge}
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl [@media(max-height:760px)]:text-[1.75rem]">
          {dict.hero.title}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg [@media(max-height:760px)]:text-sm">
          {dict.hero.subtitle}
        </p>

        <div className="flex flex-wrap justify-center gap-3 [@media(max-height:760px)]:mt-1">
          <Link
            href={`${base}/tours`}
            className="inline-flex h-12 items-center rounded-full bg-coral-700 px-7 font-display text-base font-bold text-white shadow-xl shadow-coral-500/30 transition hover:bg-coral-800"
          >
            {dict.hero.ctaPrimary}
          </Link>
          <Link
            href={`${base}/transfers`}
            className="inline-flex h-12 items-center rounded-full border border-white/40 bg-white/10 px-7 font-display text-base font-bold text-white backdrop-blur transition hover:bg-white/20 max-[380px]:hidden"
          >
            {dict.hero.ctaSecondary}
          </Link>
        </div>

        <dl className="grid w-full max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4 [@media(max-height:760px)]:hidden">
          {[
            { value: String(stats.tours), label: dict.hero.statTours },
            { value: "10+", label: dict.hero.statYears },
            { value: "2.5k+", label: dict.hero.statGuests },
            { value: "4.9★", label: dict.hero.statRating },
          ].map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-2xl font-extrabold sm:text-3xl">{s.value}</dd>
              <dd className="mt-1 text-xs text-white/70">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
