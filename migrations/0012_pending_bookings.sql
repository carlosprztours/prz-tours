-- Tabla temporal para reservas pendientes de pago PayPal
CREATE TABLE IF NOT EXISTS pending_bookings (
  paypal_order_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL, -- JSON con datos de la reserva
  expires_at TEXT NOT NULL -- datetime ISO
);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_expires ON pending_bookings(expires_at);