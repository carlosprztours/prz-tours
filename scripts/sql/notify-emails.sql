-- Destinatarios internos de los avisos automáticos de la web.
--
-- Lista separada por comas (códigos en lib/notify/email.ts → getInternalRecipients).
-- Si se borra esta clave, los avisos vuelven a ir solo a `email`.
--
-- Buzón del dominio (Spacemail) + correo personal siempre activo + personal.
INSERT INTO settings (key, value) VALUES
  ('notify_emails', 'asistencia@perez-tours.com,pereztoursandtransfer@gmail.com,carlosdavidpere@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- Correo de contacto que se muestra en la web.
INSERT INTO settings (key, value) VALUES ('email', 'asistencia@perez-tours.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;