-- ============================================================================
-- Perez Tours & Transfers — esquema inicial (Cloudflare D1 / SQLite)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Usuarios del panel de administración
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,          -- pbkdf2-sha256$iterations$salt$hash
  role          TEXT    NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','editor')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users (email);

-- Sesiones en base de datos: permiten revocar el acceso desde el panel.
CREATE TABLE sessions (
  id         TEXT    PRIMARY KEY,          -- id público (uuid)
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT    NOT NULL,
  user_agent TEXT,
  ip         TEXT
);

CREATE INDEX idx_sessions_user    ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- Intento de registro público (clientes que se registran para ver sus reservas)
CREATE TABLE customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL,
  phone         TEXT,
  password_hash TEXT    NOT NULL,
  locale        TEXT    NOT NULL DEFAULT 'es',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Tours
-- ---------------------------------------------------------------------------
CREATE TABLE tours (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT    NOT NULL UNIQUE,
  price            REAL    NOT NULL DEFAULT 0,
  price_unit       TEXT    NOT NULL DEFAULT 'person' CHECK (price_unit IN ('person','vehicle','group')),
  duration_minutes INTEGER NOT NULL DEFAULT 480,
  category         TEXT    NOT NULL DEFAULT 'adventure',
  difficulty       TEXT    NOT NULL DEFAULT 'easy'  CHECK (difficulty IN ('easy','moderate','challenging')),
  age_min          INTEGER,
  pickup_note      TEXT,
  is_featured      INTEGER NOT NULL DEFAULT 0,
  is_published     INTEGER NOT NULL DEFAULT 1,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tours_published ON tours (is_published, sort_order);

CREATE TABLE tour_translations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id     INTEGER NOT NULL REFERENCES tours (id) ON DELETE CASCADE,
  locale      TEXT    NOT NULL CHECK (locale IN ('es','en')),
  title       TEXT    NOT NULL,
  summary     TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  seo_title       TEXT,
  seo_description TEXT,
  UNIQUE (tour_id, locale)
);

CREATE INDEX idx_tour_translations_tour ON tour_translations (tour_id);

CREATE TABLE tour_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id    INTEGER NOT NULL REFERENCES tours (id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  alt        TEXT    NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tour_images_tour ON tour_images (tour_id);

-- Listas del detalle de tour: incluidas / no incluidas / qué llevar
CREATE TABLE tour_list_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id    INTEGER NOT NULL REFERENCES tours (id) ON DELETE CASCADE,
  locale     TEXT    NOT NULL CHECK (locale IN ('es','en')),
  section    TEXT    NOT NULL CHECK (section IN ('included','excluded','bring')),
  label      TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tour_list_items_tour ON tour_list_items (tour_id, locale, section);

-- ---------------------------------------------------------------------------
-- Traslados
-- ---------------------------------------------------------------------------
CREATE TABLE transfer_routes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_key         TEXT    NOT NULL,       -- p.ej. 'POP', 'SDQ', 'STI', 'PUJ', 'SAX', 'MOC'
  origin_label       TEXT    NOT NULL,
  origin_airport     TEXT,
  destination        TEXT    NOT NULL,
  price_1_5          REAL    NOT NULL DEFAULT 0,
  price_6_11         REAL    NOT NULL DEFAULT 0,
  price_note         TEXT,                   -- p.ej. 'Rango $140–160'
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_published       INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_transfer_routes_published ON transfer_routes (is_published, sort_order);

-- ---------------------------------------------------------------------------
-- Testimonios y galería
-- ---------------------------------------------------------------------------
CREATE TABLE testimonials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name   TEXT    NOT NULL,
  author_origin TEXT    NOT NULL DEFAULT '',
  rating        INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  text_es       TEXT    NOT NULL DEFAULT '',
  text_en       TEXT    NOT NULL DEFAULT '',
  tour_slug     TEXT,
  avatar_url    TEXT,
  is_published  INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE gallery_images (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  url          TEXT    NOT NULL,
  alt          TEXT    NOT NULL DEFAULT '',
  caption      TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Reservas  (fuente de verdad para las métricas de ingresos)
-- ---------------------------------------------------------------------------
CREATE TABLE bookings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT    NOT NULL UNIQUE,          -- PRZ-7F3K2Q
  kind            TEXT    NOT NULL DEFAULT 'tour' CHECK (kind IN ('tour','transfer','custom')),

  tour_id         INTEGER REFERENCES tours (id) ON DELETE SET NULL,
  tour_slug       TEXT,
  tour_title      TEXT    NOT NULL DEFAULT '',      -- snapshot al momento de reservar

  transfer_route_id INTEGER REFERENCES transfer_routes (id) ON DELETE SET NULL,
  transfer_label  TEXT,

  customer_name   TEXT    NOT NULL,
  customer_email  TEXT    NOT NULL,
  customer_phone  TEXT    NOT NULL DEFAULT '',
  customer_country TEXT,

  guests          INTEGER NOT NULL DEFAULT 1,
  unit_price      REAL    NOT NULL DEFAULT 0,
  total_price     REAL    NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'USD',

  booked_for      TEXT,                              -- fecha del tour (YYYY-MM-DD)
  pickup_time     TEXT,
  hotel           TEXT,
  airport         TEXT,
  cruise_port     TEXT,
  meeting_point   TEXT,

  locale          TEXT    NOT NULL DEFAULT 'es',
  notes           TEXT,

  status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','completed','cancelled')),
  payment_status  TEXT    NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','partial','paid','refunded')),

  source          TEXT    NOT NULL DEFAULT 'web',
  whatsapp_sent   INTEGER NOT NULL DEFAULT 0,
  email_sent      INTEGER NOT NULL DEFAULT 0,
  client_ip       TEXT,

  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  confirmed_at    TEXT,
  completed_at    TEXT,
  cancelled_at    TEXT
);

CREATE INDEX idx_bookings_status    ON bookings (status);
CREATE INDEX idx_bookings_created   ON bookings (created_at);
CREATE INDEX idx_bookings_date      ON bookings (booked_for);
CREATE INDEX idx_bookings_tour      ON bookings (tour_id);
CREATE INDEX idx_bookings_email     ON bookings (customer_email);

CREATE TABLE booking_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  note        TEXT,
  actor       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_booking_events_booking ON booking_events (booking_id);

-- ---------------------------------------------------------------------------
-- Ajustes del sitio (clave/valor)
-- ---------------------------------------------------------------------------
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Formulario de contacto
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  phone      TEXT,
  subject    TEXT,
  body       TEXT    NOT NULL,
  locale     TEXT    NOT NULL DEFAULT 'es',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_read ON messages (is_read, created_at);
