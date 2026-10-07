/*
 * Inserta reservas de prueba en la base LOCAL para verificar el panel.
 * No usar en producción. Se puede borrar con `npm run db:reset:local`
 * seguido de migrate + seed.
 *
 *   node scripts/seed-test-bookings.mjs
 */
import { d1Execute } from "./lib/run-wrangler.mjs";

const sql = `
INSERT INTO bookings
  (reference, kind, tour_id, tour_slug, tour_title, customer_name, customer_email,
   customer_phone, guests, unit_price, total_price, currency, booked_for,
   hotel, locale, notes, status, payment_status, source,
   created_at, confirmed_at, completed_at)
VALUES
  ('PRZ-TEST01', 'tour', 1, 'damajagua-waterfalls', 'Cascadas de Damajagua',
   'María García', 'maria@example.com', '+18090000001', 2, 60, 120, 'USD',
   date('now', '+7 days'), 'Hotel Iberostar', 'es', 'Prueba: pendiente', 'pending', 'unpaid', 'web',
   datetime('now'), NULL, NULL),
  ('PRZ-TEST02', 'tour', 3, 'puerto-plata-city-tour', 'City Tour de Puerto Plata',
   'John Smith', 'john@example.com', '+18090000002', 4, 40, 160, 'USD',
   date('now', '+3 days'), 'Embarcadero Amber Cove', 'en', 'Prueba: confirmada', 'confirmed', 'partial', 'web',
   datetime('now'), datetime('now'), NULL),
  ('PRZ-TEST03', 'tour', 7, 'paradise-island', 'Paradise Island (Cayo Arena)',
   'Familia Pérez', 'familia@example.com', '+18090000003', 5, 125, 625, 'USD',
   date('now', '-5 days'), 'Lifestyle Resort', 'es', 'Prueba: completada', 'completed', 'paid', 'web',
   date('now', '-10 days'), date('now', '-9 days'), date('now', '-5 days')),
  ('PRZ-TEST04', 'transfer', NULL, NULL, '',
   'Anna Müller', 'anna@example.com', '+18090000004', 2, 100, 100, 'USD',
   date('now', '+1 day'), 'Playa Dorada', 'en', 'Prueba: cancelada', 'cancelled', 'refunded', 'web',
   datetime('now'), NULL, NULL);

INSERT INTO booking_events (booking_id, from_status, to_status, note, actor)
SELECT id, NULL, 'pending', 'Reserva de prueba', 'seed'
FROM bookings WHERE reference LIKE 'PRZ-TEST%';
`;

d1Execute("prz-tours", "--local", sql);
console.log("✓ 4 reservas de prueba insertadas (TEST01 pendiente, TEST02 confirmada, TEST03 completada, TEST04 cancelada).");
