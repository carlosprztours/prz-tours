-- Additive. Existing localized content remains in its original tables.
CREATE TABLE IF NOT EXISTS content_translation_cache (
  source_hash TEXT PRIMARY KEY,
  translated_text TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'translated', 'error')),
  attempts INTEGER NOT NULL DEFAULT 0,
  retry_after INTEGER NOT NULL DEFAULT 0
);
