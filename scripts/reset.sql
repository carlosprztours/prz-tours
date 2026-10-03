-- Vacía toda la base de datos local (orden inverso de dependencias).
-- Solo para desarrollo: `npm run db:reset:local`.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS booking_events;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS gallery_images;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS transfer_routes;
DROP TABLE IF EXISTS tour_list_items;
DROP TABLE IF EXISTS tour_images;
DROP TABLE IF EXISTS tour_translations;
DROP TABLE IF EXISTS tours;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;
