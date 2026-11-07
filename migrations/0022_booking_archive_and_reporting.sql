ALTER TABLE bookings ADD COLUMN archived_at TEXT;
ALTER TABLE bookings ADD COLUMN excluded_from_reports_at TEXT;
CREATE INDEX idx_bookings_archive ON bookings(archived_at, created_at DESC, id DESC);

CREATE TABLE booking_reporting_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('archive','restore','exclude','include')),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 240),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_booking_reporting_events ON booking_reporting_events(booking_id, id DESC);
