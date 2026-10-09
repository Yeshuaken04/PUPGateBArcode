-- ============================================================================
-- RASPBERRY PI LOCAL SQLITE SCHEMA (OFFLINE GATE FALLBACK)
-- ============================================================================

-- 1. Cached Authorized Students for offline authorization
CREATE TABLE IF NOT EXISTS authorized_students (
  student_number TEXT PRIMARY KEY,
  full_name TEXT,
  rfid_uid TEXT UNIQUE,
  qr_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_local_rfid ON authorized_students(rfid_uid);
CREATE INDEX IF NOT EXISTS idx_local_qr ON authorized_students(qr_code);

-- 2. Pending Offline Scan Events Queue
CREATE TABLE IF NOT EXISTS pending_events (
  event_id TEXT PRIMARY KEY,
  student_number TEXT,
  credential TEXT NOT NULL,
  type TEXT NOT NULL, -- 'rfid' or 'qr'
  gate_code TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'entry' or 'exit'
  result TEXT NOT NULL DEFAULT 'offline',
  scanned_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_synced ON pending_events(synced);
