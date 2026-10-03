-- ============================================================================
-- 0002 — Cuentas de clientes en `users`
--
-- Decisión: una sola tabla de cuentas con roles admin | editor | customer.
-- El registro público crea siempre `customer`; la promoción a staff es manual
-- desde el panel (nunca auto-registro de admins).
-- ============================================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer'
                CHECK (role IN ('admin','editor','customer')),
  phone         TEXT,
  locale        TEXT    NOT NULL DEFAULT 'es' CHECK (locale IN ('es','en')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, email, name, password_hash, role, is_active, created_at, updated_at)
  SELECT id, email, name, password_hash, role, is_active, created_at, updated_at
  FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

PRAGMA foreign_keys = ON;
