import type {ChannelProfile} from '@video-kit/core/channels';
import type {EditableVideoSpec} from '@video-kit/core/contracts';

/**
 * The three fields a category can require, which the studio never collected.
 *
 * `db:check-editorial` reported an error on every Learn project in the
 * database — 24 of them, three each — because `audience.ageBand`,
 * `editorial.objective` and `editorial.safetyStatus` are mandatory for that
 * category and nothing in the studio could set them. The only way in was a raw
 * spec PUT.
 *
 * Rendered only when the project's category asks for something, so tech and
 * fun projects are not given three boxes they do not need.
 */
const SAFETY_STATUSES = ['draft', 'reviewed', 'approved'] as const;

type Editorial = NonNullable<EditableVideoSpec['editorial']>;

/**
 * `editorial.language` carries a schema default, so it is required on the
 * parsed type. Spreading a spec that has no editorial block at all would drop
 * it, so it is restated rather than assumed present.
 */
const patchEditorial = (
  spec: EditableVideoSpec,
  patch: Partial<Editorial>,
): EditableVideoSpec => ({
  ...spec,
  editorial: {
    language: spec.editorial?.language ?? 'en-US',
    ...spec.editorial,
    ...patch,
  },
});

export const ProjectMetadata = ({
  spec,
  channel,
  onChange,
}: {
  spec: EditableVideoSpec;
  channel: ChannelProfile;
  onChange: (spec: EditableVideoSpec) => void;
}) => {
  const {requiresAgeBand, requiresLearningObjective, requiresSafetyReview} =
    channel.editorial;
  if (!requiresAgeBand && !requiresLearningObjective && !requiresSafetyReview) {
    return null;
  }

  const missing =
    (requiresAgeBand && !spec.audience?.ageBand) ||
    (requiresLearningObjective && !spec.editorial?.objective) ||
    (requiresSafetyReview &&
      !['reviewed', 'approved'].includes(spec.editorial?.safetyStatus ?? ''));

  return (
    <details className="project-metadata" open={missing}>
      <summary>
        {channel.shortLabel} details
        {missing ? <small>incomplete</small> : null}
      </summary>
      <div className="project-metadata-panel">
        {requiresAgeBand ? (
          <label className="field compact">
            <span>Age band</span>
            <input
              value={spec.audience?.ageBand ?? ''}
              placeholder="6–9"
              onChange={(event) =>
                onChange({
                  ...spec,
                  audience: {...spec.audience, ageBand: event.target.value || undefined},
                })
              }
            />
          </label>
        ) : null}
        {requiresLearningObjective ? (
          <label className="field compact">
            <span>Learning objective</span>
            <textarea
              rows={2}
              value={spec.editorial?.objective ?? ''}
              placeholder="What a viewer can do afterwards that they could not before."
              onChange={(event) =>
                onChange(
                  patchEditorial(spec, {objective: event.target.value || undefined}),
                )
              }
            />
          </label>
        ) : null}
        {requiresSafetyReview ? (
          <label className="field compact">
            <span>Safety review</span>
            <select
              value={spec.editorial?.safetyStatus ?? 'draft'}
              onChange={(event) =>
                onChange(
                  patchEditorial(spec, {
                    safetyStatus: event.target.value as Editorial['safetyStatus'],
                  }),
                )
              }
            >
              {SAFETY_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </details>
  );
};
