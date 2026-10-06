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
    if (!res.ok) {
      // Se avisa porque si no el fallo es invisible: el campo en inglés se
      // queda vacío y parece que la auto-traducción funciona.
      console.warn(`[translate] MyMemory respondió ${res.status}; sin traducción.`);
      return "";
    }
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
      responseDetails?: string;
      /** MyMemory lo pone a `true` cuando la IP se agotó el cupo diario. */
      quotaFinished?: boolean | number;
    };
    const translated = data.responseData?.translatedText?.trim();

    // MyMemory avisa con `quotaFinished` cuando la IP agotó el cupo diario, y
    // con `responseStatus` distinto de 200 cuando no pudo atender la petición.
    // Lo primero y lo segundo son fallos distintos y quien llama puede
    // reaccionar distinto: uno se arregla esperando al día siguiente, el otro
    // suele ser un texto que MyMemory simplemente no sabe traducir.
    const sinCuota =
      data.quotaFinished !== undefined &&
      data.quotaFinished !== false &&
      String(data.quotaFinished).toLowerCase() !== "false" &&
      Number(data.quotaFinished) !== 0;

    if (sinCuota) {
      throw new TranslationQuotaExceeded();
    }

    if (!translated || data.responseStatus !== 200) {
      console.warn(
        `[translate] MyMemory sin traducción (status=${data.responseStatus}, ` +
          `cuota=${String(data.quotaFinished ?? "?")}): ${data.responseDetails ?? "sin detalle"}`,
      );
      return "";
    }

    // MyMemory devuelve el texto tal cual cuando no encuentra traducción. No es
    // un fallo: simplemente no hay traducción para ese texto.
    if (translated.toLowerCase() === trimmed.toLowerCase()) {
      return "";
    }
    return translated;
  } catch (err) {
    if (err instanceof TranslationQuotaExceeded) throw err;
    console.warn("[translate] fallo al llamar a MyMemory:", String(err).slice(0, 160));
    return "";
  }
}

/**
 * MyMemory es un servicio gratuito con tope diario por IP. Las IPs de salida de
 * los Workers de Cloudflare están compartidas, así que desde el servidor el
 * tope se agota enseguida.
 *
 * Se lanza este error (en vez de devolver "") para que quien llame pueda
 * distinguir «no hay traducción para este texto» de «no se pudo traducir nada».
 */
export class TranslationQuotaExceeded extends Error {
  constructor() {
    super("MyMemory: cuota diaria agotada para esta IP");
    this.name = "TranslationQuotaExceeded";
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
