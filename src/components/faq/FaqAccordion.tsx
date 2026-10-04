/**
 * Acordeón de preguntas frecuentes (Server Component, sin JS).
 *
 * Usa `<details>` nativo: accesible y funciona sin JavaScript.
 * Incluye JSON-LD `FAQPage` para SEO.
 */
import { JsonLd } from "@/components/seo/JsonLd";
import type { Faq, Locale } from "@/types";

export function FaqAccordion({
  faqs,
  locale,
  title,
}: {
  faqs: Faq[];
  locale: Locale;
  title: string;
}) {
  if (faqs.length === 0) return null;

  const items = faqs.map((f) => ({
    q: (locale === "es" ? f.question_es : f.question_en) || f.question_es,
    a: (locale === "es" ? f.answer_es : f.answer_en) || f.answer_es,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="mx-auto mt-12 max-w-3xl">
      <JsonLd data={jsonLd} />
      <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6 grid gap-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-sand-200 bg-white px-5 py-4 shadow-sm open:shadow-md"
          >
            <summary className="cursor-pointer list-none font-display text-base font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <span aria-hidden="true" className="text-xl text-ocean-600 transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
