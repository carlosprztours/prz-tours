-- Vacía toda la base de datos local (solo desarrollo: `npm run db:reset:local`).
--
-- Cubre TODAS las tablas creadas por migrations/*.sql (0001 → 0009).
-- Si añades una tabla nueva, añádela también aquí o el reset la dejará viva.

PRAGMA foreign_keys = OFF;

-- Hijas primero (dependen de users / bookings / tours).
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS booking_events;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS webauthn_credentials;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS activity_log;

DROP TABLE IF EXISTS tour_list_items;
DROP TABLE IF EXISTS tour_images;
DROP TABLE IF EXISTS tour_translations;
DROP TABLE IF EXISTS tours;
DROP TABLE IF EXISTS tour_categories;
DROP TABLE IF EXISTS article_translations;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS gallery_images;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS transfer_routes;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS users;

-- Registro de migraciones de wrangler: para que `db:migrate:local`
-- vuelva a aplicar 0001 → 0009 desde cero.
DROP TABLE IF EXISTS d1_migrations;

PRAGMA foreign_keys = ON;