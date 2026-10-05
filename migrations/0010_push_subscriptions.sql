-- ============================================================================
-- 0010 — Notificaciones push (PWA instalable).
-- ============================================================================
--
-- Cada navegador que acepta el permiso guarda su suscripción Web Push. La
-- tabla permite reenviar a todos los dispositivos de un usuario y borrar las
-- suscripciones que el navegador ya no reconoce (endpoint 404/410).

CREATE TABLE push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  endpoint   TEXT    NOT NULL UNIQUE,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  user_agent TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT  NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);

-- Invitaciones a instalar la PWA / activar notificaciones: una vez por
-- usuario para no molestar en cada visita.
CREATE TABLE push_prompts (
  user_id       INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  install_seen_at    TEXT,
  install_accepted   INTEGER NOT NULL DEFAULT 0,
  notify_seen_at     TEXT,
  notify_accepted    INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);