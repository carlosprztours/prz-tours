-- Destinatarios internos de los avisos automáticos de la web.
--
-- Dos listas separadas por comas (código en lib/notify/email.ts):
--
-- 1) `notify_emails` = avisos generales: mensajes de contacto, cambios de
--    estado y la copia oculta (BCC) de constancia de TODO lo que sale de la
--    web (reservas, cancelaciones, pagos, cupones). Aquí va el buzón del
--    dominio, que guarda constancia de todo lo pendiente.
--
-- 2) `notify_booking_emails` = SOLO el aviso de reserva nueva (tours y
--    traslados). Estos correos NO reciben contacto ni la copia BCC del resto.
--
-- Editable desde /admin/settings; este archivo es la fuente para reaplicar
-- el valor tras un `reset.sql`.
INSERT INTO settings (key, value) VALUES
  ('notify_emails', 'asistencia@perez-tours.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

INSERT INTO settings (key, value) VALUES
  ('notify_booking_emails', 'pereztoursandtransfer@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- Correo de contacto que se muestra en la web. Es además el `reply_to`
-- por defecto, así que las respuestas del cliente llegan al buzón del dominio.
INSERT INTO settings (key, value) VALUES ('email', 'asistencia@perez-tours.com')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;