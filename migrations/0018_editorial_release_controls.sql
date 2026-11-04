ALTER TABLE tour_editorial_translation ADD COLUMN approvals TEXT NOT NULL DEFAULT '[]';

-- Each deployment binds its own D1. Start paused until the budget, plan and
-- scheduled handler have been validated for that environment.
CREATE TABLE IF NOT EXISTS preview_translation_budget (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  calls INTEGER NOT NULL DEFAULT 0,
  chars INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL DEFAULT 0,
  busy INTEGER NOT NULL DEFAULT 0,
  halted INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO preview_translation_budget (id) VALUES (1);

ALTER TABLE transfer_routes ADD COLUMN approved_price_note_en TEXT;
