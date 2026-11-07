// Positions in the persisted tour source and English snapshots.
export const reviewFields = [
  { index: 2, label: "Descripción" },
  { index: 5, label: "Incluye" },
  { index: 6, label: "No incluye" },
  { index: 7, label: "Qué llevar" },
  { index: 8, label: "Nota de recogida" },
] as const;

export function editorialSnapshot(value: string | null): string[] {
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
}

export function reviewToken(source: string[], english: string[], index: number) {
  return source[index] && english[index] ? JSON.stringify([source[index], english[index]]) : "";
}

export function publishReviewedTourEnglish(source: string[], english: string[], approvals: string[]) {
  const published = [...english];
  for (const { index } of reviewFields) {
    const token = reviewToken(source, english, index);
    if (!token || approvals[index] !== token) published[index] = "";
  }
  return published;
}

export function existingPickupNote(locale: "es" | "en", hasManualEnglish: boolean, source: string | null) {
  // These older tours share one audited pickup note between both locales.
  if (locale === "es" && source === "We provide pick-up service from all cruise ports and hotels.") {
    return "Ofrecemos recogida en todos los puertos de cruceros y hoteles.";
  }
  return locale === "es" || hasManualEnglish ? source : null;
}
