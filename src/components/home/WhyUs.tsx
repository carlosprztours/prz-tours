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
          {items.map((item, i) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-3xl border border-sand-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ocean-600 to-coral-500"
              />
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-50 text-ocean-700 ring-1 ring-ocean-100 transition group-hover:scale-110 group-hover:bg-ocean-600 group-hover:text-white">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {item.icon}
                </svg>
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-coral-700">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 font-display text-xl font-extrabold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
