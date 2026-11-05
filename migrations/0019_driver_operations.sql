-- Expand the role CHECK without dropping users or firing foreign-key cascades.
ALTER TABLE users RENAME COLUMN role TO previous_role;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('admin', 'editor', 'photographer', 'customer', 'driver'));
UPDATE users SET role = previous_role;
ALTER TABLE users DROP COLUMN previous_role;

CREATE TABLE service_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  driver_name TEXT NOT NULL,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  withdrawn_at TEXT,
  withdrawn_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  arrived_at TEXT,
  started_at TEXT,
  finished_at TEXT
);
CREATE UNIQUE INDEX service_assignment_active_booking
  ON service_assignments(booking_id) WHERE withdrawn_at IS NULL;
CREATE INDEX service_assignment_driver ON service_assignments(driver_id, withdrawn_at);
CREATE INDEX service_assignment_history ON service_assignments(booking_id, id DESC);

CREATE TABLE service_qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES service_assignments(id) ON DELETE RESTRICT,
  token_hash TEXT NOT NULL UNIQUE,
  issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  revoked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  validated_at TEXT,
  validated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX service_qr_current ON service_qr_codes(assignment_id) WHERE revoked_at IS NULL;

CREATE TRIGGER service_assignment_replace BEFORE INSERT ON service_assignments
BEGIN
  UPDATE service_assignments SET withdrawn_at = datetime('now'), withdrawn_by = NEW.assigned_by
    WHERE booking_id = NEW.booking_id AND withdrawn_at IS NULL;
END;

CREATE TRIGGER service_qr_replace BEFORE INSERT ON service_qr_codes
BEGIN
  UPDATE service_qr_codes SET revoked_at = datetime('now'), revoked_by = NEW.issued_by
    WHERE assignment_id = NEW.assignment_id AND revoked_at IS NULL;
END;

CREATE TRIGGER users_revoke_changed_permissions AFTER UPDATE OF role, is_active ON users
WHEN OLD.role != NEW.role OR OLD.is_active != NEW.is_active
BEGIN
  DELETE FROM sessions WHERE user_id = NEW.id;
  UPDATE service_assignments SET withdrawn_at = datetime('now')
    WHERE driver_id = NEW.id AND withdrawn_at IS NULL AND finished_at IS NULL
      AND (NEW.role != 'driver' OR NEW.is_active != 1);
END;

CREATE TRIGGER users_withdraw_deleted_driver BEFORE DELETE ON users
WHEN OLD.role = 'driver'
BEGIN
  UPDATE service_assignments SET withdrawn_at = datetime('now')
    WHERE driver_id = OLD.id AND withdrawn_at IS NULL AND finished_at IS NULL;
END;
