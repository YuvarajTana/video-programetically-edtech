-- Move untouched Tech defaults to true 1x narration. A hard maximum prevents
-- the local timing fitter from silently accelerating an overlong script.
UPDATE categories
SET definition_json = json_set(
      definition_json,
      '$.voice.speed',
      1.0,
      '$.voice.maxSpeed',
      1.0,
      '$.editorial.maxNarrationWpm',
      165
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tech'
  AND json_extract(definition_json, '$.voice.speed') = 0.98
  AND json_extract(definition_json, '$.voice.maxSpeed') IS NULL
  AND json_extract(definition_json, '$.editorial.maxNarrationWpm') = 220;
