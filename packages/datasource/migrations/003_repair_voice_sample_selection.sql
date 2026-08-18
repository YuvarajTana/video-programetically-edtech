-- Preserve the newest valid enrollment takes as the active consent and reference.
-- Earlier versions allowed a later invalid consent upload to replace a valid take.
UPDATE voice_consents
SET
  recording_path = (
    SELECT sample.path
    FROM voice_samples AS sample
    WHERE sample.profile_id = voice_consents.profile_id
      AND sample.purpose = 'consent'
      AND json_extract(sample.quality_json, '$.valid') = 1
    ORDER BY sample.created_at DESC
    LIMIT 1
  ),
  recording_checksum = (
    SELECT sample.checksum
    FROM voice_samples AS sample
    WHERE sample.profile_id = voice_consents.profile_id
      AND sample.purpose = 'consent'
      AND json_extract(sample.quality_json, '$.valid') = 1
    ORDER BY sample.created_at DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1
  FROM voice_samples AS sample
  WHERE sample.profile_id = voice_consents.profile_id
    AND sample.purpose = 'consent'
    AND json_extract(sample.quality_json, '$.valid') = 1
);

UPDATE voice_profile_versions
SET primary_sample_id = (
  SELECT sample.id
  FROM voice_samples AS sample
  WHERE sample.profile_id = voice_profile_versions.profile_id
    AND sample.purpose = 'reference'
    AND json_extract(sample.quality_json, '$.valid') = 1
  ORDER BY sample.created_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM voice_samples AS sample
  WHERE sample.profile_id = voice_profile_versions.profile_id
    AND sample.purpose = 'reference'
    AND json_extract(sample.quality_json, '$.valid') = 1
);
