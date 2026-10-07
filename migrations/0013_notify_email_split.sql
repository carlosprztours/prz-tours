-- Reparto de avisos por correo (ver lib/notify/email.ts).
--
-- Antes: `notify_emails` contenía buzón del dominio + correo del guía +
-- correo personal, así que el guía y el personal recibían TODO lo que salía
-- de la web (contacto, pagos, cupones) además de la confirmación de reserva.
--
-- Ahora se separa en dos listas:
--   notify_emails          → avisos generales (contacto) + copia BCC de
--                             constancia de todo. Se queda SOLO el buzón del
--                             dominio.
--   notify_booking_emails  → SOLO el aviso de reserva nueva (tours y
--                             traslados). Se mueve aquí el correo del guía.
-- Se elimina el correo personal de las listas y del correo de contacto.

-- 1) Retirar del aviso general las direcciones que ya no deben recibir todo.
UPDATE settings
SET value = TRIM(
  REPLACE(REPLACE(REPLACE(
    ',' || REPLACE(value, ' ', '') || ',',
    ',carlosdavidpere@gmail.com,', ','),
    ',pereztoursandtransfer@gmail.com,', ','),
  ',,', ','), ',')
WHERE key = 'notify_emails'
  AND (
    value LIKE '%carlosdavidpere@gmail.com%'
    OR value LIKE '%pereztoursandtransfer@gmail.com%'
  );

-- 2) El correo del guía pasa a la lista EXCLUSIVA de reservas confirmadas.
INSERT INTO settings (key, value)
VALUES ('notify_booking_emails', 'pereztoursandtransfer@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- 3) Si el correo de contacto mostrado en la web fuera el personal, se
--    restaura al buzón del dominio.
UPDATE settings SET value = 'asistencia@perez-tours.com'
WHERE key = 'email' AND value LIKE '%carlosdavidpere@gmail.com%';