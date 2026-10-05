-- ============================================================================
-- 0009 — Categorías personalizadas de tours.
-- ============================================================================
--
-- Antes la categoría era un CHECK fijo de 6 valores. Ahora es una tabla
-- para que el admin cree las que quiera (p. ej. "Gastronomía", "Aventura
-- extrema", "Familiar"). Se conservan las 6 originales como semilla.
--
-- SQLite no permite convertir un CHECK en clave foránea, así que se
-- reconstruye la tabla `tours`. IMPORTANTE: el esquema nuevo replica
-- exactamente las columnas de 0001 + 0004 (incluidas max_group,
-- cruise_friendly y deposit_percent); si se añade una columna a `tours`
-- hay que añadirla también aquí.

PRAGMA foreign_keys = OFF;

CREATE TABLE tour_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  label_es    TEXT    NOT NULL,
  label_en    TEXT    NOT NULL DEFAULT '',
  icon        TEXT    NOT NULL DEFAULT '✨',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO tour_categories (slug, label_es, label_en, icon, sort_order) VALUES
  ('water',      'Agua',       'Water',     '💧', 1),
  ('adventure',  'Aventura',   'Adventure', '🏔️', 2),
  ('culture',    'Cultura',    'Culture',   '🏛️', 3),
  ('wildlife',   'Naturaleza', 'Wildlife',  '🦜', 4),
  ('beach',      'Playa',      'Beach',     '🏝️', 5),
  ('other',      'Otros',      'Other',     '✨', 6);

CREATE TABLE tours_new (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT    NOT NULL UNIQUE,
  price             REAL    NOT NULL DEFAULT 0,
  price_unit        TEXT    NOT NULL DEFAULT 'person' CHECK (price_unit IN ('person','vehicle','group')),
  duration_minutes  INTEGER NOT NULL DEFAULT 480,
  category          TEXT    NOT NULL DEFAULT 'other' REFERENCES tour_categories (slug),
  difficulty        TEXT    NOT NULL DEFAULT 'easy'  CHECK (difficulty IN ('easy','moderate','challenging')),
  age_min           INTEGER,
  pickup_note       TEXT,
  max_group         INTEGER NOT NULL DEFAULT 20,
  cruise_friendly   INTEGER NOT NULL DEFAULT 0,
  deposit_percent   INTEGER NOT NULL DEFAULT 0,
  is_featured       INTEGER NOT NULL DEFAULT 0,
  is_published      INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO tours_new
  (id, slug, price, price_unit, duration_minutes, category, difficulty,
   age_min, pickup_note, max_group, cruise_friendly, deposit_percent,
   is_featured, is_published, sort_order, created_at, updated_at)
SELECT id, slug, price, price_unit, duration_minutes, category, difficulty,
   age_min, pickup_note, max_group, cruise_friendly, deposit_percent,
   is_featured, is_published, sort_order, created_at, updated_at
FROM tours;

DROP TABLE tours;
ALTER TABLE tours_new RENAME TO tours;

CREATE INDEX IF NOT EXISTS idx_tours_published ON tours (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_tours_category  ON tours (category);

PRAGMA foreign_keys = ON;