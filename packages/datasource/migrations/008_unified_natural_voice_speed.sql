-- Use the provider's natural 1x delivery for every untouched built-in channel.
-- A hard maximum makes an overlong script fail review instead of accelerating
-- the approved narration during timing fit.
UPDATE categories
SET definition_json = json_set(
      definition_json,
      '$.voice.speed',
      1.0,
      '$.voice.maxSpeed',
      1.0
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id IN ('tech', 'learn', 'fun')
  AND json_extract(definition_json, '$.voice.speed') IN (0.92, 0.98, 1.0, 1.08)
  AND (
    json_extract(definition_json, '$.voice.maxSpeed') IS NULL
    OR json_extract(definition_json, '$.voice.maxSpeed') = 1.0
  );
