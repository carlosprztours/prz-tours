-- Vídeos de la galería y asignables a una ruta concreta.
CREATE TABLE IF NOT EXISTS gallery_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  poster TEXT,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT,
  -- 'gallery': aparece en /{lang}/gallery. 'tour': en la página de la ruta
  -- indicada en tour_slug.
  placement TEXT NOT NULL DEFAULT 'gallery',
  tour_slug TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gallery_videos_published ON gallery_videos(is_published, placement, sort_order);
