/**
 * Bloques de información del tour: datos clave + listas incluido/no
 * incluido/qué llevar.
 */
import type { Dictionary } from "@/lib/i18n";
import type { TourWithContent } from "@/types";
import { formatDuration } from "./TourCard";

type Props = {
  tour: TourWithContent;
  dict: Dictionary;
};

function difficultyLabel(difficulty: string, dict: Dictionary["common"]): string {
  if (difficulty === "moderate") return dict.difficultyModerate;
  if (difficulty === "challenging") return dict.difficultyChallenging;
  return dict.difficultyEasy;
}

export function TourInfo({ tour, dict }: Props) {
  const facts = [
    { label: dict.common.duration, value: formatDuration(tour.duration_minutes, dict.common) },
    { label: dict.common.difficulty, value: difficultyLabel(tour.difficulty, dict.common) },
    ...(tour.age_min != null && tour.age_min > 0
      ? [{ label: dict.tours.minAge, value: `${tour.age_min}+` }]
      : []),
  ];

  const sections = [
    { key: "included" as const, title: dict.tours.includedTitle, icon: "✓", color: "text-emerald-600 bg-emerald-50" },
    { key: "excluded" as const, title: dict.tours.excludedTitle, icon: "✕", color: "text-red-500 bg-red-50" },
    { key: "bring" as const, title: dict.tours.bringTitle, icon: "🎒", color: "text-ocean-700 bg-ocean-50" },
  ];

  return (
    <div className="grid gap-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">{f.label}</dt>
            <dd className="mt-1 font-display text-base font-bold text-ink-900">{f.value}</dd>
          </div>
        ))}
      </dl>

      {tour.pickup_note && (
        <div className="flex items-start gap-3 rounded-2xl border border-ocean-100 bg-ocean-50 p-4">
          <span className="text-xl" aria-hidden="true">📍</span>
          <div>
            <p className="text-sm font-bold text-ocean-800">{dict.tours.pickupTitle}</p>
            <p className="text-sm text-ink-700">{tour.pickup_note}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {sections.map((s) => (
          <div key={s.key}>
            <h3 className="font-display text-lg font-bold text-ink-900">{s.title}</h3>
            <ul className="mt-3 space-y-2">
              {tour.lists[s.key].map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm text-ink-700">
                  <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.color}`} aria-hidden="true">
                    {s.icon}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
