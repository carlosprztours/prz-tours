/**
 * Banner final de llamada a la acción (fondo océano + botón coral).
 */
import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/types";

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function CtaBanner({ locale, dict }: Props) {
  return (
    <section className="bg-ocean-950 py-16 text-white sm:py-20">
      <div className="container-site mx-auto max-w-3xl text-center">
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
          {dict.home.ctaTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-white/80">
          {dict.home.ctaSubtitle}
        </p>
        <Link
          href={`/${locale}/tours`}
          className="mt-8 inline-flex h-12 items-center rounded-full bg-coral-700 px-8 font-display text-base font-bold text-white shadow-xl shadow-coral-500/30 transition hover:bg-coral-800"
        >
          {dict.home.ctaButton}
        </Link>
      </div>
    </section>
  );
}
