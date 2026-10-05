-- 0006: passkeys (WebAuthn) — huella, Face ID o PIN del dispositivo.
--
-- Cada fila es un autenticador registrado por un usuario. La clave pública
-- (COSE, en base64url) verifica las firmas; `counter` previene replays.
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  credential_id TEXT    NOT NULL UNIQUE,
  public_key    TEXT    NOT NULL,
  counter       INTEGER NOT NULL DEFAULT 0,
  transports    TEXT,
  device_name   TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials (user_id);
