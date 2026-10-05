-- ============================================================================
-- 0009 — Categorías personalizadas de tours.
-- ============================================================================
--
-- Antes la categoría era un CHECK fijo de 6 valores. Ahora es una tabla para
-- que el admin cree las que quiera (p. ej. "Gastronomía", "Aventura extrema",
-- "Familiar"). Se conservan las 6 originales como semilla.
--
-- IMPORTANTE — por qué NO se reconstruye `tours`:
-- `tour_translations`, `tour_images` y `tour_list_items` tienen
-- `ON DELETE CASCADE` sobre `tour_id`. Un `DROP TABLE tours` (necesario para
-- tocar CHECKs o claves foráneas en SQLite) hace que SQLite aplique la
-- cascada y se lleve por delante TODO el contenido de tours. Ya pasó una vez:
-- esta migración vació las traducciones, imágenes y listas en la base remota.
--
-- Solución: `tours.category` sigue siendo un TEXT normal, sin CHECK ni clave
-- foránea, y la validez del slug la comprueba el código
-- (`normalizeCategory` en `src/lib/admin/tours.ts`). Añadir o quitar filas de
-- `tour_categories` no requiere tocar `tours`.

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

CREATE INDEX IF NOT EXISTS idx_tours_category ON tours (category);