-- Destinatarios internos de los avisos automáticos de la web.
--
-- Lista separada por comas (códigos en lib/notify/email.ts → getInternalRecipients).
-- Si se borra esta clave, los avisos vuelven a ir solo a `email`.
--
-- Todo lo que sale de la web se copia además en copia oculta (BCC) a esta
-- lista: reservas, cancelaciones, cambios de estado, pagos y cupones. Así el
-- buzón del dominio guarda constancia de todo lo pendiente.
--
-- Buzón del dominio (Spacemail) + correo personal del cliente.
-- Para añadir a otra persona del personal, basta con añadirla aquí y en
-- /admin/settings (que es lo que lee la web; este archivo es la fuente para
-- reaplicar el valor tras un `reset.sql`).
INSERT INTO settings (key, value) VALUES
  ('notify_emails', 'asistencia@perez-tours.com,pereztoursandtransfer@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- Correo de contacto que se muestra en la web. Es además el `reply_to`
-- por defecto, así que las respuestas del cliente llegan al buzón del dominio.
INSERT INTO settings (key, value) VALUES ('email', 'asistencia@perez-tours.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;