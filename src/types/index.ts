/**
 * Tipos del dominio.
 *
 * Estos tipos reflejan la forma de los registros en D1 (ver migrations/0001_init.sql).
 * Todas las consultas de la capa de datos devuelven objetos de estos tipos.
 */

export type Locale = "es" | "en";

/** Cómo se cobra el precio de un tour. */
export type PriceUnit = "person" | "vehicle" | "group";

/** Nivel de exigencia física del tour. */
export type Difficulty = "easy" | "moderate" | "challenging";

/** Categoría principal, usada para filtrar y para el icono. */
export type TourCategory =
  | "water"
  | "adventure"
  | "culture"
  | "wildlife"
  | "beach"
  | "other";

/** Secciones de listas dentro del detalle de un tour. */
export type TourListSection = "included" | "excluded" | "bring";

export type TourListItem = {
  id: number;
  tour_id: number;
  locale: Locale;
  section: TourListSection;
  label: string;
  sort_order: number;
};

export type TourImage = {
  id: number;
  tour_id: number;
  url: string;
  alt: string;
  sort_order: number;
};

/** Un tour junto con sus traducciones e imágenes (forma "plana" de la fila). */
export type Tour = {
  id: number;
  slug: string;
  price: number;
  price_unit: PriceUnit;
  duration_minutes: number;
  category: TourCategory;
  difficulty: Difficulty;
  age_min: number | null;
  pickup_note: string | null;
  max_group: number;
  cruise_friendly: number;
  deposit_percent: number;
  is_featured: number;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Contenido textual de un tour en un idioma concreto. */
export type TourTranslation = {
  id: number;
  tour_id: number;
  locale: Locale;
  title: string;
  summary: string;
  description: string;
  seo_title: string | null;
  seo_description: string | null;
};

/** Tour listo para renderizar: la fila + su traducción + imágenes + listas. */
export type TourWithContent = Tour & {
  translation: TourTranslation;
  fallbackTranslation?: TourTranslation | null;
  images: TourImage[];
  lists: Record<TourListSection, TourListItem[]>;
};

export type TransferRoute = {
  id: number;
  origin_key: string;
  origin_label: string;
  origin_airport: string | null;
  destination: string;
  price_1_5: number;
  price_6_11: number;
  price_note: string | null;
  sort_order: number;
  is_published: number;
};

export type Testimonial = {
  id: number;
  author_name: string;
  author_origin: string;
  rating: number;
  text_es: string;
  text_en: string;
  tour_slug: string | null;
  avatar_url: string | null;
  is_published: number;
  sort_order: number;
  created_at: string;
};

export type GalleryImage = {
  id: number;
  url: string;
  alt: string;
  caption: string | null;
  is_published: number;
  sort_order: number;
  created_at: string;
};

/** Estados posibles de una reserva. */
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type BookingKind = "tour" | "transfer" | "custom";

export type Booking = {
  id: number;
  reference: string;
  kind: BookingKind;
  tour_id: number | null;
  tour_slug: string | null;
  tour_title: string;
  transfer_route_id: number | null;
  transfer_label: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_country: string | null;
  guests: number;
  unit_price: number;
  total_price: number;
  currency: string;
  promo_code: string | null;
  discount_amount: number;
  deposit_due: number;
  deposit_paid: number;
  stripe_session_id: string | null;
  booked_for: string | null;
  pickup_time: string | null;
  hotel: string | null;
  airport: string | null;
  cruise_port: string | null;
  meeting_point: string | null;
  locale: Locale;
  notes: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  source: string;
  whatsapp_sent: number;
  email_sent: number;
  client_ip: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type BookingEvent = {
  id: number;
  booking_id: number;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  note: string | null;
  actor: string | null;
  created_at: string;
};

export type UserRole = "admin" | "editor" | "customer";

export type User = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  locale: Locale;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type UserWithSecret = User & { password_hash: string };

export type Session = {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
  user_agent: string | null;
  ip: string | null;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  body: string;
  locale: Locale;
  is_read: number;
  created_at: string;
};

/** Métricas agregadas del dashboard. */
export type DashboardMetrics = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  /** Suma de total_price de las reservas confirmadas y completadas. */
  totalRevenue: number;
  /** Ingresos del mes en curso. */
  monthRevenue: number;
  /** Ingresos del mes anterior, para calcular la variación. */
  lastMonthRevenue: number;
  /** Viajeros: suma de guests de confirmadas + completadas. */
  totalGuests: number;
  bookingCount: number;
  unreadMessages: number;
  publishedTours: number;
};

export type RevenueByMonth = {
  month: string;
  revenue: number;
  bookings: number;
};

export type RevenueByTour = {
  tour_slug: string | null;
  tour_title: string;
  revenue: number;
  bookings: number;
};

export type PromoCode = {
  id: number;
  code: string;
  kind: "percent" | "amount";
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type Article = {
  id: number;
  slug: string;
  cover_url: string | null;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ArticleTranslation = {
  id: number;
  article_id: number;
  locale: Locale;
  title: string;
  excerpt: string;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
};

export type ArticleWithContent = Article & {
  translation: ArticleTranslation;
};

export type Faq = {
  id: number;
  question_es: string;
  answer_es: string;
  question_en: string;
  answer_en: string;
  sort_order: number;
  is_published: number;
};

export type ActivityEntry = {
  id: number;
  user_id: number | null;
  actor: string | null;
  action: string;
  detail: string | null;
  created_at: string;
  actor_email?: string | null;
};
