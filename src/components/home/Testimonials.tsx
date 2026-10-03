/**
 * Testimonios de clientes con estrellas (solo publicados).
 */
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stars } from "@/components/ui/Stars";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, Testimonial } from "@/types";

type Props = {
  locale: Locale;
  dict: Dictionary;
  testimonials: Testimonial[];
};

export function Testimonials({ locale, dict, testimonials }: Props) {
  if (testimonials.length === 0) return null;
  return (
    <section className="bg-sand-50 py-16 sm:py-20">
      <div className="container-site">
        <SectionHeading title={dict.home.testimonialsTitle} subtitle={dict.home.testimonialsSubtitle} />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="flex flex-col rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
              <Stars rating={t.rating} />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
                “{locale === "es" ? t.text_es : t.text_en}”
              </blockquote>
              <figcaption className="mt-4 border-t border-sand-100 pt-3">
                <p className="font-display text-sm font-bold text-ink-900">{t.author_name}</p>
                {t.author_origin && (
                  <p className="text-xs text-ink-500">{t.author_origin}</p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
