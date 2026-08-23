-- Expand built-in channel limits without overwriting user-customized categories.
UPDATE categories
SET definition_json = json_set(
      definition_json,
      '$.editorial.maxSeconds',
      1800
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tech'
  AND json_extract(definition_json, '$.editorial.maxSeconds') = 480;

UPDATE categories
SET definition_json = json_set(
      definition_json,
      '$.editorial.maxSeconds',
      1800
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'learn'
  AND json_extract(definition_json, '$.editorial.maxSeconds') = 90;

UPDATE categories
SET definition_json = json_set(
      definition_json,
      '$.editorial.maxSeconds',
      1800
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'fun'
  AND json_extract(definition_json, '$.editorial.maxSeconds') = 45;

-- Keep template versions immutable: activate a new version only for untouched v1 seeds.
INSERT OR IGNORE INTO template_versions
  (id, template_id, version, definition_json, created_at)
SELECT
  'tech-youtube-deep-dive-v2',
  'tech-youtube-deep-dive',
  2,
  json_set(
    definition_json,
    '$.label',
    'Tech YouTube — 5–30-minute deep dive'
  ),
  CURRENT_TIMESTAMP
FROM template_versions
WHERE id = 'tech-youtube-deep-dive-v1'
  AND json_extract(definition_json, '$.label') =
    'Tech YouTube — five-minute deep dive';

UPDATE templates
SET label = 'Tech YouTube — 5–30-minute deep dive',
    active_version_id = 'tech-youtube-deep-dive-v2',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tech-youtube-deep-dive'
  AND active_version_id = 'tech-youtube-deep-dive-v1'
  AND EXISTS (
    SELECT 1
    FROM template_versions
    WHERE id = 'tech-youtube-deep-dive-v2'
  );
