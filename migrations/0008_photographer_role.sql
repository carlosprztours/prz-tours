-- ============================================================================
-- 0008 — Rol `photographer` (solo galería) en `users`.
-- ============================================================================
--
-- SQLite no deja alterar un CHECK: se reconstruye la tabla (como en 0002),
-- conservando columnas, ids y datos (incluye google_id/invite/referidos).

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer'
                CHECK (role IN ('admin','editor','photographer','customer')),
  phone         TEXT,
  locale        TEXT    NOT NULL DEFAULT 'es' CHECK (locale IN ('es','en')),
  google_id     TEXT,
  invite_code   TEXT,
  referred_by   INTEGER REFERENCES users_new (id) ON DELETE SET NULL,
  loyalty_trips INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new
  (id, email, name, password_hash, role, phone, locale, google_id,
   invite_code, referred_by, loyalty_trips, is_active, created_at, updated_at)
  SELECT id, email, name, password_hash, role, phone, locale, google_id,
   invite_code, referred_by, loyalty_trips, is_active, created_at, updated_at
  FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users (invite_code);

PRAGMA foreign_keys = ON;
