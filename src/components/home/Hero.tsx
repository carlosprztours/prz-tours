/**
 * Hero de la home: foto de Cayo Arena, titular, CTAs y estadísticas.
 */
import Image from "next/image";
import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  locale: Locale;
  dict: Dictionary;
  stats: { tours: number };
};

export function Hero({ locale, dict, stats }: Props) {
  const base = `/${locale}`;
  return (
    <section className="relative overflow-hidden bg-ocean-950 text-white">
      <Image
        src="/img/island-hero.jpg"
        alt="Cayo Arena"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ocean-950 via-ocean-950/40 to-transparent" aria-hidden="true" />

      <div className="container-site relative flex min-h-[540px] flex-col justify-center py-20 sm:min-h-[600px]">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">
          {dict.hero.badge}
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
          {dict.hero.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
          {dict.hero.subtitle}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`${base}/tours`}
            className="inline-flex h-12 items-center rounded-full bg-coral-500 px-7 font-display text-base font-bold text-white shadow-xl shadow-coral-500/30 transition hover:bg-coral-600"
          >
            {dict.hero.ctaPrimary}
          </Link>
          <Link
            href={`${base}/transfers`}
            className="inline-flex h-12 items-center rounded-full border border-white/40 bg-white/10 px-7 font-display text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            {dict.hero.ctaSecondary}
          </Link>
        </div>

        <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
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
