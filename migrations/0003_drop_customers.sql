-- ============================================================================
-- 0003 — Elimina la tabla `customers` (huérfana)
--
-- El registro público crea usuarios con rol 'customer' en `users`.
-- `customers` nunca se usó en la app; si alguna BD tuviera filas, se migran
-- primero (sin password: quedan inactivas hasta que el cliente se registre).
-- ============================================================================

PRAGMA foreign_keys = OFF;

INSERT INTO users (email, name, password_hash, role, phone, locale, is_active, created_at)
  SELECT email, name, 'migrated-' || id, 'customer', phone,
         CASE WHEN locale IN ('es', 'en') THEN locale ELSE 'es' END,
         0, created_at
  FROM customers
  WHERE email NOT IN (SELECT email FROM users);

DROP TABLE customers;

PRAGMA foreign_keys = ON;
