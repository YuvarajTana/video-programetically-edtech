CREATE TABLE IF NOT EXISTS uploaded_narrations (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  locale TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds REAL NOT NULL,
  checksum TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE project_variants
  ADD COLUMN narration_asset_id TEXT REFERENCES uploaded_narrations(id);

CREATE INDEX IF NOT EXISTS uploaded_narrations_created_idx
  ON uploaded_narrations(created_at DESC);
