-- 0015 — Slides del carrusel hero de la portada (editables desde /admin/portada).
CREATE TABLE IF NOT EXISTS hero_slides (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url    TEXT    NOT NULL,
  alt          TEXT    NOT NULL DEFAULT '',
  caption      TEXT    NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hero_slides_published ON hero_slides (is_published, sort_order);
