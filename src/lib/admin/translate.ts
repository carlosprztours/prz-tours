/**
 * Auto-traducción ES→EN para tours.
 *
 * Cuando el admin llena los campos en español pero deja los de inglés
 * vacíos, se traducen automáticamente al guardar. Usa MyMemory (gratis,
 * sin API key para volúmenes pequeños). Si falla la traducción, los
 * campos en inglés quedan vacíos (no se rompe el guardado).
 *
 * Solo se traduce si el campo destino está vacío: si el admin ya escribió
 * algo en inglés, se respeta.
 */
import "server-only";

const ENDPOINT = "https://api.mymemory.translated.net/get";

export async function translateEsToEn(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    const url = `${ENDPOINT}?q=${encodeURIComponent(trimmed)}&langpair=es|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const translated = data.responseData?.translatedText?.trim();
    if (!translated || data.responseStatus !== 200) return "";
    // MyMemory a veces devuelve el texto original si no encuentra traducción
    if (translated.toLowerCase() === trimmed.toLowerCase()) return "";
    return translated;
  } catch {
    return "";
  }
}

/** Pares de campos bilingües que se auto-traducen de ES a EN. */
const BILINGUAL_FIELDS = [
  "title",
  "summary",
  "description",
  "seo_title",
  "seo_description",
  "label",
  "question",
  "answer",
  "excerpt",
  "body",
] as const;

/**
 * Traduce los campos bilingües de ES a EN **solo si el destino está vacío**.
 * Si el admin ya escribió el inglés, se respeta tal cual.
 *
 * Devuelve un FormData nuevo (no muta el original) con los campos rellenados.
 */
export async function autoTranslateTour(formData: FormData): Promise<FormData> {
  const result = new FormData();
  for (const [key, value] of formData.entries()) {
    result.append(key, value);
  }
  for (const field of BILINGUAL_FIELDS) {
    const en = String(result.get(`${field}_en`) ?? "").trim();
    const es = String(result.get(`${field}_es`) ?? "").trim();
    if (!en && es) {
      const translated = await translateEsToEn(es);
      if (translated) result.set(`${field}_en`, translated);
    }
  }
  return result;
}
