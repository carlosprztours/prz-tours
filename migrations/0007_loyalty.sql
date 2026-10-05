-- ============================================================================
-- 0007 — Programa de fidelidad: cupones personales, referidos y avisos.
-- ============================================================================

PRAGMA foreign_keys = OFF;

-- A qué cuenta pertenece cada reserva (reservar ya exige sesión).
ALTER TABLE bookings ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);

-- Código de invitación de cada usuario + quién lo invitó + contador de
-- viajes completados hacia el próximo cupón (cada 2 viajes = 1 cupón).
ALTER TABLE users ADD COLUMN invite_code TEXT;
ALTER TABLE users ADD COLUMN referred_by INTEGER REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN loyalty_trips INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users (invite_code);

-- Cupones personales (conviven con los genéricos de `promo_codes`).
-- reason: invite | loyalty | manual. status: active | used | expired | cancelled.
CREATE TABLE IF NOT EXISTS coupons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','amount')),
  value       REAL    NOT NULL DEFAULT 10,
  reason      TEXT    NOT NULL DEFAULT 'manual' CHECK (reason IN ('invite','loyalty','manual')),
  status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  booking_id  INTEGER REFERENCES bookings (id) ON DELETE SET NULL,
  expires_at  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  used_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_coupons_user ON coupons (user_id, status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);

-- Mini-sistema de avisos en la web (campana + sección en Mi cuenta).
-- type: booking-confirmed | payment | coupon | info
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       TEXT    NOT NULL DEFAULT 'info',
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL DEFAULT '',
  link       TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at);
