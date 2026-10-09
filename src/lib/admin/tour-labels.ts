/**
 * Etiquetas del editor de tours (ES/EN).
 */
import type { Locale } from "@/types";

export function tourFormLabels(locale: Locale) {
  const es = locale === "es";
  return {
    base: es ? "Datos base" : "Basics",
    slug: "Slug (URL)",
    price: es ? "Precio (USD)" : "Price (USD)",
    priceUnit: es ? "Unidad de precio" : "Price unit",
    unitPerson: es ? "Por persona" : "Per person",
    unitVehicle: es ? "Por vehículo" : "Per vehicle",
    unitGroup: es ? "Por grupo" : "Per group",
    duration: es ? "Duración (minutos)" : "Duration (minutes)",
    category: es ? "Categoría" : "Category",
    difficulty: es ? "Dificultad" : "Difficulty",
    easy: es ? "Fácil" : "Easy",
    moderate: es ? "Moderada" : "Moderate",
    challenging: es ? "Desafiante" : "Challenging",
    ageMin: es ? "Edad mínima (vacío = todas)" : "Min. age (empty = all)",
    maxGroup: es ? "Cupo máximo por día (0 = sin límite)" : "Max group per day (0 = unlimited)",
    deposit: es ? "Anticipo % (0 = sin anticipo)" : "Deposit % (0 = none)",
    pickupNote: es ? "Nota de recogida" : "Pickup note",
    featured: es ? "Destacado en la home" : "Featured on home",
    published: es ? "Publicado" : "Published",
    order: es ? "Orden" : "Order",
    texts: es ? "Textos" : "Texts",
    title: es ? "Título" : "Title",
    summary: es ? "Resumen" : "Summary",
    description: es ? "Descripción (párrafos separados por línea en blanco)" : "Description (paragraphs separated by blank lines)",
    seoTitle: "SEO title",
    seoDescription: "SEO description",
    images: es ? "Imágenes" : "Images",
    imagesHint: es
      ? "Una por línea con formato: url | texto alternativo"
      : "One per line as: url | alt text",
    lists: es ? "Listas" : "Lists",
    included: es ? "Incluye" : "Included",
    excluded: es ? "No incluye" : "Not included",
    bring: es ? "Qué llevar" : "What to bring",
    save: es ? "Guardar" : "Save",
    saving: es ? "Guardando…" : "Saving…",
    saved: es ? "Guardado." : "Saved.",
    errors: es
      ? {
          "bad-slug": "El slug no es válido.",
          "slug-taken": "Ese slug ya existe.",
        }
      : {
          "bad-slug": "That slug is not valid.",
          "slug-taken": "That slug already exists.",
        },
  };
}
