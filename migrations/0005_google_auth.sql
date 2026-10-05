-- 0005: login con Google (OAuth) — vincula la cuenta de Google al usuario.
--
-- Identificador de Google (sub). NULL para cuentas solo con contraseña.
-- El índice único permite muchos NULL (cada cuenta Google un sub distinto).
ALTER TABLE users ADD COLUMN google_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
