/**
 * Catálogo de textos editables de la web (admin /textos).
 *
 * Cada clave base genera ajustes `base_es` / `base_en` (las imágenes, una sola
 * clave sin idioma). Los componentes leen con `getSiteTexts` usando el
 * diccionario como respaldo: lo no rellenado sigue mostrando el texto original.
 */
export type TextKeyDef = {
  /** Base sin sufijo de idioma (`hero_title` → `hero_title_es/_en`). */
  base: string;
  labelEs: string;
  labelEn: string;
  /** textarea en vez de input corto. */
  long?: boolean;
  /** Es URL de imagen (una sola clave + subida a ImageKit). */
  image?: boolean;
};

export type TextGroup = { titleEs: string; titleEn: string; keys: TextKeyDef[] };

export const TEXT_GROUPS: TextGroup[] = [
  {
    titleEs: "Portada: hero",
    titleEn: "Homepage: hero",
    keys: [
      { base: "hero_badge", labelEs: "Etiqueta superior", labelEn: "Top badge" },
      { base: "hero_title", labelEs: "Titular", labelEn: "Headline", long: true },
      { base: "hero_subtitle", labelEs: "Subtítulo", labelEn: "Subheading", long: true },
      { base: "hero_cta_primary", labelEs: "Botón principal", labelEn: "Primary button" },
      { base: "hero_cta_secondary", labelEs: "Botón secundario", labelEn: "Secondary button" },
    ],
  },
  {
    titleEs: "Portada: por qué elegirnos",
    titleEn: "Homepage: why us",
    keys: [
      { base: "home_why_title", labelEs: "Título", labelEn: "Title" },
      { base: "home_why_subtitle", labelEs: "Subtítulo", labelEn: "Subtitle" },
      { base: "home_why_1_title", labelEs: "Motivo 1: título", labelEn: "Reason 1: title" },
      { base: "home_why_1_text", labelEs: "Motivo 1: texto", labelEn: "Reason 1: text", long: true },
      { base: "home_why_2_title", labelEs: "Motivo 2: título", labelEn: "Reason 2: title" },
      { base: "home_why_2_text", labelEs: "Motivo 2: texto", labelEn: "Reason 2: text", long: true },
      { base: "home_why_3_title", labelEs: "Motivo 3: título", labelEn: "Reason 3: title" },
      { base: "home_why_3_text", labelEs: "Motivo 3: texto", labelEn: "Reason 3: text", long: true },
    ],
  },
  {
    titleEs: "Portada: secciones y cierre",
    titleEn: "Homepage: sections and CTA",
    keys: [
      { base: "home_tours_title", labelEs: "Tours: título", labelEn: "Tours: title" },
      { base: "home_tours_subtitle", labelEs: "Tours: subtítulo", labelEn: "Tours: subtitle" },
      { base: "home_testi_title", labelEs: "Opiniones: título", labelEn: "Reviews: title" },
      { base: "home_testi_subtitle", labelEs: "Opiniones: subtítulo", labelEn: "Reviews: subtitle" },
      { base: "home_gallery_title", labelEs: "Galería: título", labelEn: "Gallery: title" },
      { base: "home_gallery_subtitle", labelEs: "Galería: subtítulo", labelEn: "Gallery: subtitle" },
      { base: "home_gallery_more", labelEs: "Galería: botón ver más", labelEn: "Gallery: see-more button" },
      { base: "home_cta_title", labelEs: "Cierre: título", labelEn: "CTA: title", long: true },
      { base: "home_cta_subtitle", labelEs: "Cierre: subtítulo", labelEn: "CTA: subtitle", long: true },
      { base: "home_cta_button", labelEs: "Cierre: botón", labelEn: "CTA: button" },
    ],
  },
  {
    titleEs: "Páginas: títulos",
    titleEn: "Pages: headings",
    keys: [
      { base: "tours_title", labelEs: "Tours: título", labelEn: "Tours: title" },
      { base: "tours_subtitle", labelEs: "Tours: subtítulo", labelEn: "Tours: subtitle", long: true },
      { base: "transfers_title", labelEs: "Traslados: título", labelEn: "Transfers: title" },
      { base: "transfers_subtitle", labelEs: "Traslados: subtítulo", labelEn: "Transfers: subtitle", long: true },
      { base: "gallery_title", labelEs: "Galería: título", labelEn: "Gallery: title" },
      { base: "gallery_subtitle", labelEs: "Galería: subtítulo", labelEn: "Gallery: subtitle", long: true },
      { base: "contact_title", labelEs: "Contacto: título", labelEn: "Contact: title" },
      { base: "contact_subtitle", labelEs: "Contacto: subtítulo", labelEn: "Contact: subtitle", long: true },
    ],
  },
  {
    titleEs: "Nosotros",
    titleEn: "About",
    keys: [
      { base: "about_title", labelEs: "Título", labelEn: "Title" },
      { base: "about_subtitle", labelEs: "Subtítulo", labelEn: "Subtitle", long: true },
      { base: "about_mission_title", labelEs: "Misión: título", labelEn: "Mission: title" },
      { base: "about_local_title", labelEs: "Bloque local: título", labelEn: "Local block: title" },
      { base: "about_local_text", labelEs: "Bloque local: texto", labelEn: "Local block: text", long: true },
      { base: "about_quality_title", labelEs: "Bloque calidad: título", labelEn: "Quality block: title" },
      { base: "about_quality_text", labelEs: "Bloque calidad: texto", labelEn: "Quality block: text", long: true },
      { base: "about_img_mission", labelEs: "Foto misión (URL)", labelEn: "Mission photo (URL)", image: true },
      { base: "about_img_local", labelEs: "Foto local (URL)", labelEn: "Local photo (URL)", image: true },
      { base: "about_img_quality", labelEs: "Foto calidad (URL)", labelEn: "Quality photo (URL)", image: true },
    ],
  },
];

/** Todas las bases, para consultas en lote. */
export const ALL_TEXT_BASES: string[] = TEXT_GROUPS.flatMap((g) => g.keys.map((k) => k.base));

/**
 * Claves sensibles: solo el super-admin las ve y las toca.
 * PayPal/Stripe mueven dinero real; un admin normal no debe ni verlas.
 */
const SENSITIVE_PREFIXES = ["paypal_", "stripe_"];

export function isSensitiveKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return SENSITIVE_PREFIXES.some((p) => k.startsWith(p));
}

/**
 * Explicación clara por texto: dónde sale y qué pasa si se cambia.
 * Clave = base (sin _es/_en).
 */
export const TEXT_HINTS: Record<string, { es: string; en: string }> = {
  hero_badge: { es: "Etiqueta pequeña sobre el titular de portada.", en: "Small label above the homepage headline." },
  hero_title: { es: "Titular grande de portada (es el H1).", en: "Big homepage headline (the H1)." },
  hero_subtitle: { es: "Texto bajo el titular de portada.", en: "Text under the homepage headline." },
  hero_cta_primary: { es: "Botón coral: lleva a Tours.", en: "Coral button: goes to Tours." },
  hero_cta_secondary: { es: "Botón borde: lleva a Traslados.", en: "Outline button: goes to Transfers." },
  home_why_title: { es: "Título de la sección “por qué elegirnos”.", en: "“Why us” section title." },
  home_why_subtitle: { es: "Subtítulo de esa sección.", en: "That section's subtitle." },
  home_why_1_title: { es: "Tarjeta 1: título.", en: "Card 1: title." },
  home_why_1_text: { es: "Tarjeta 1: texto.", en: "Card 1: text." },
  home_why_2_title: { es: "Tarjeta 2: título.", en: "Card 2: title." },
  home_why_2_text: { es: "Tarjeta 2: texto.", en: "Card 2: text." },
  home_why_3_title: { es: "Tarjeta 3: título.", en: "Card 3: title." },
  home_why_3_text: { es: "Tarjeta 3: texto.", en: "Card 3: text." },
  home_tours_title: { es: "Título del bloque de tours en portada.", en: "Homepage tours block title." },
  home_tours_subtitle: { es: "Subtítulo de ese bloque.", en: "That block's subtitle." },
  home_testi_title: { es: "Título del bloque de opiniones.", en: "Reviews block title." },
  home_testi_subtitle: { es: "Subtítulo de ese bloque.", en: "That block's subtitle." },
  home_gallery_title: { es: "Título del bloque de galería.", en: "Gallery block title." },
  home_gallery_subtitle: { es: "Subtítulo de ese bloque.", en: "That block's subtitle." },
  home_gallery_more: { es: "Texto del botón que abre la galería completa.", en: "Button text opening the full gallery." },
  home_cta_title: { es: "Título del cierre azul antes del pie.", en: "Title of the blue closing block." },
  home_cta_subtitle: { es: "Texto de ese cierre.", en: "That block's text." },
  home_cta_button: { es: "Botón de ese cierre: lleva a Tours.", en: "That block's button: goes to Tours." },
  tours_title: { es: "Título de la página Tours (es su H1).", en: "Tours page title (its H1)." },
  tours_subtitle: { es: "Subtítulo de esa página.", en: "That page's subtitle." },
  transfers_title: { es: "Título de Traslados (es su H1).", en: "Transfers page title (its H1)." },
  transfers_subtitle: { es: "Subtítulo de esa página.", en: "That page's subtitle." },
  gallery_title: { es: "Título de Galería (es su H1).", en: "Gallery page title (its H1)." },
  gallery_subtitle: { es: "Subtítulo de esa página.", en: "That page's subtitle." },
  contact_title: { es: "Título de Contacto (es su H1).", en: "Contact page title (its H1)." },
  contact_subtitle: { es: "Subtítulo de esa página.", en: "That page's subtitle." },
  about_title: { es: "Título de Nosotros (es su H1).", en: "About page title (its H1)." },
  about_subtitle: { es: "Subtítulo de esa página.", en: "That page's subtitle." },
  about_mission_title: { es: "Título del bloque misión.", en: "Mission block title." },
  about_local_title: { es: "Título del bloque local.", en: "Local block title." },
  about_local_text: { es: "Texto del bloque local.", en: "Local block text." },
  about_quality_title: { es: "Título del bloque calidad.", en: "Quality block title." },
  about_quality_text: { es: "Texto del bloque calidad.", en: "Quality block text." },
  about_img_mission: { es: "Foto del bloque misión. Pega la URL o súbela.", en: "Mission block photo. Paste the URL or upload it." },
  about_img_local: { es: "Foto del bloque local. Pega la URL o súbela.", en: "Local block photo. Paste the URL or upload it." },
  about_img_quality: { es: "Foto del bloque calidad. Pega la URL o súbela.", en: "Quality block photo. Paste the URL or upload it." },
};

/**
 * Explicaciones de los ajustes generales (Ajustes). Sin el ajuste, la web usa
 * su valor de respaldo.
 */
export const SETTING_HINTS: Record<string, { es: string; en: string }> = {
  whatsapp: { es: "Número que abre el chat de WhatsApp en reservas y flotante. Formato: +18494019417.", en: "Number opening the WhatsApp chat. Format: +18494019417." },
  email: { es: "Correo de contacto visible y reply-to de los avisos.", en: "Visible contact email and reply-to." },
  phone_display: { es: "Teléfono como se muestra (ej. +1 (849) 401-9417).", en: "Phone as displayed." },
  address: { es: "Dirección del pie de página.", en: "Footer address." },
  hours_es: { es: "Horario en español (pie y contacto).", en: "Hours in Spanish." },
  hours_en: { es: "Horario en inglés.", en: "Hours in English." },
  hours: { es: "Horario genérico (si no hay por idioma).", en: "Fallback hours." },
  currency: { es: "Moneda de los precios (USD).", en: "Price currency (USD)." },
  notify_emails: { es: "Quién recibe TODOS los avisos (contacto + copia de todo). Separados por comas.", en: "Who gets ALL notifications. Comma-separated." },
  notify_booking_emails: { es: "Quién recibe SOLO el aviso de reserva nueva.", en: "Who gets ONLY new-booking alerts." },
  instagram: { es: "URL de Instagram. Vacío = no se muestra el icono.", en: "Instagram URL. Empty = icon hidden." },
  facebook: { es: "URL de Facebook. Vacío = no se muestra.", en: "Facebook URL. Empty = hidden." },
  tiktok: { es: "URL de TikTok. Vacío = no se muestra.", en: "TikTok URL. Empty = hidden." },
  mission: { es: "Texto de misión en Nosotros. Vacío = se oculta el bloque.", en: "About mission text. Empty = block hidden." },
  site_name: { es: "Nombre del negocio en títulos y correos.", en: "Business name in titles and emails." },
  paypal_client_id: { es: "SOLO super-admin. Client ID de PayPal.", en: "Super-admin ONLY. PayPal client ID." },
  paypal_secret: { es: "SOLO super-admin. Secreto: se pega, nunca se muestra.", en: "Super-admin ONLY. Secret: paste-only, never shown." },
  paypal_mode: { es: "SOLO super-admin. sandbox = pruebas, live = dinero real.", en: "Super-admin ONLY. sandbox = tests, live = real money." },
};
