CREATE TABLE IF NOT EXISTS tour_editorial_translation (
  tour_id INTEGER PRIMARY KEY REFERENCES tours(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  english TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'translated', 'outdated', 'error'))
);
