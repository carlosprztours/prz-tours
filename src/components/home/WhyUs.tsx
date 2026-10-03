/**
 * "Por qué elegirnos": tres tarjetas (confiables / divertidos / seguros).
 */
import type { Dictionary } from "@/lib/i18n";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function WhyUs({ dict }: { dict: Dictionary }) {
  const items = [
    {
      title: dict.home.whyTrustworthy,
      text: dict.home.whyTrustworthyText,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
      ),
    },
    {
      title: dict.home.whyFun,
      text: dict.home.whyFunText,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4 0-7-3-7-7 0-5 4-6 5-9 2 1 2 3 2 4 3-1 7 1 7 5 0 4-3 7-7 7z" />
      ),
    },
    {
      title: dict.home.whySafe,
      text: dict.home.whySafeText,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      ),
    },
  ];

  return (
    <section className="bg-sand-50 py-16 sm:py-20">
      <div className="container-site">
        <SectionHeading title={dict.home.whyUsTitle} subtitle={dict.home.whyUsSubtitle} />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-sand-200 bg-white p-7 shadow-sm">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-600 text-white">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  {item.icon}
                </svg>
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
