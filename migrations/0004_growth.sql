-- ============================================================================
-- 0004 — Paquete crecimiento: disponibilidad, cruceros, promos, blog, FAQ,
-- auditoría y depósitos.
-- ============================================================================

PRAGMA foreign_keys = OFF;

-- Tours: capacidad diaria, sello crucero y anticipo (%).
ALTER TABLE tours ADD COLUMN max_group INTEGER NOT NULL DEFAULT 20;
ALTER TABLE tours ADD COLUMN cruise_friendly INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tours ADD COLUMN deposit_percent INTEGER NOT NULL DEFAULT 0;

-- Códigos promocionales.
CREATE TABLE promo_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  kind        TEXT    NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','amount')),
  value       REAL    NOT NULL DEFAULT 0,
  max_uses    INTEGER,
  used_count  INTEGER NOT NULL DEFAULT 0,
  valid_from  TEXT,
  valid_to    TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Reservas: promo aplicada + anticipo.
ALTER TABLE bookings ADD COLUMN promo_code TEXT;
ALTER TABLE bookings ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN deposit_due REAL NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN deposit_paid REAL NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN stripe_session_id TEXT;

-- Auditoría de acciones del staff.
CREATE TABLE activity_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users (id) ON DELETE SET NULL,
  actor      TEXT,
  action     TEXT    NOT NULL,
  detail     TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_activity_log_created ON activity_log (created_at DESC);

-- Blog.
CREATE TABLE articles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  cover_url    TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE article_translations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id  INTEGER NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  locale      TEXT    NOT NULL CHECK (locale IN ('es','en')),
  title       TEXT    NOT NULL,
  excerpt     TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL DEFAULT '',
  seo_title       TEXT,
  seo_description TEXT,
  UNIQUE (article_id, locale)
);

CREATE INDEX idx_article_translations_article ON article_translations (article_id);

-- Preguntas frecuentes (bilingüe en plano, como testimonios).
CREATE TABLE faqs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  question_es   TEXT    NOT NULL,
  answer_es     TEXT    NOT NULL,
  question_en   TEXT    NOT NULL DEFAULT '',
  answer_en     TEXT    NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_published  INTEGER NOT NULL DEFAULT 1
);

-- Índices para el panel y disponibilidad.
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings (booked_for, status);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_date ON bookings (tour_id, booked_for);

PRAGMA foreign_keys = ON;
