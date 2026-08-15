ALTER TABLE projects ADD COLUMN master_variant_id TEXT REFERENCES project_variants(id);

ALTER TABLE project_variants ADD COLUMN source_variant_id TEXT REFERENCES project_variants(id);
ALTER TABLE project_variants ADD COLUMN translation_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE project_variants ADD COLUMN source_revision_hash TEXT;
ALTER TABLE project_variants ADD COLUMN approved_at TEXT;
ALTER TABLE project_variants ADD COLUMN voice_profile_version_id TEXT;

ALTER TABLE jobs ADD COLUMN kind TEXT NOT NULL DEFAULT 'production';
ALTER TABLE jobs ADD COLUMN provider TEXT;
ALTER TABLE jobs ADD COLUMN cloud_confirmed INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS translation_units (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES project_variants(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL,
  field_path TEXT NOT NULL,
  source_text TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  pivot_text TEXT,
  translated_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewer_note TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(variant_id, scene_id, field_path)
);

CREATE TABLE IF NOT EXISTS project_glossary (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_term TEXT NOT NULL,
  translated_term TEXT,
  mode TEXT NOT NULL DEFAULT 'preserve',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, source_term)
);

CREATE TABLE IF NOT EXISTS voice_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  active_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS voice_consents (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  phrase_text TEXT NOT NULL,
  recording_path TEXT,
  recording_checksum TEXT,
  adult_attested INTEGER NOT NULL,
  ownership_attested INTEGER NOT NULL,
  consented_at TEXT NOT NULL,
  UNIQUE(profile_id, version)
);

CREATE TABLE IF NOT EXISTS voice_samples (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  locale TEXT NOT NULL,
  transcript TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds REAL,
  checksum TEXT NOT NULL,
  quality_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_profile_versions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  primary_sample_id TEXT REFERENCES voice_samples(id),
  consent_id TEXT NOT NULL REFERENCES voice_consents(id),
  enabled_locales_json TEXT NOT NULL,
  cloud_allowed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(profile_id, version)
);

CREATE TABLE IF NOT EXISTS voice_locale_previews (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES voice_profile_versions(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  artifact_path TEXT,
  accepted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(version_id, locale)
);

CREATE INDEX IF NOT EXISTS translation_units_variant_idx
  ON translation_units(variant_id, status);
CREATE INDEX IF NOT EXISTS glossary_project_idx
  ON project_glossary(project_id);
CREATE INDEX IF NOT EXISTS voice_samples_profile_idx
  ON voice_samples(profile_id);
CREATE INDEX IF NOT EXISTS voice_versions_profile_idx
  ON voice_profile_versions(profile_id, version);

UPDATE project_variants
SET translation_status = 'approved',
    approved_at = COALESCE(approved_at, updated_at);

UPDATE projects
SET master_variant_id = (
  SELECT id FROM project_variants
  WHERE project_variants.project_id = projects.id
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE master_variant_id IS NULL;
