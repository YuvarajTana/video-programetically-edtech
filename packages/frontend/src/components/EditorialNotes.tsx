import {useMemo} from 'react';
import type {ChannelProfile} from '@video-kit/core/channels';
import type {EditableVideoSpec} from '@video-kit/core/contracts';
import {validateSpec} from '@video-kit/core/editorial';

/**
 * The editorial rules, live, while you edit.
 *
 * They used to run only in the CLI, so a studio project could hold a static
 * frame for eight seconds or narrate at twice the channel's pace and nothing
 * said so until someone watched the render. Running them here is the whole
 * point of making them isomorphic.
 *
 * No asset probe is passed: the browser cannot check whether a file exists in
 * public/, and the rules skip those checks rather than guess. The job's own
 * validate stage runs the same rules with a probe, so nothing is lost.
 */
const sceneIndexOf = (path: string) => {
  const match = /^scenes\[(\d+)\]/.exec(path);
  return match ? Number(match[1]) : null;
};

export const EditorialNotes = ({
  spec,
  channel,
  onSelectScene,
}: {
  spec: EditableVideoSpec;
  channel: ChannelProfile;
  onSelectScene: (index: number) => void;
}) => {
  const issues = useMemo(() => validateSpec(spec, channel), [spec, channel]);
  if (!issues.length) return null;

  return (
    <details className="editorial-notes" open={issues.some((i) => i.severity === 'error')}>
      <summary>
        {issues.length} editorial {issues.length === 1 ? 'note' : 'notes'}
      </summary>
      <ul>
        {issues.map((issue, index) => {
          const scene = sceneIndexOf(issue.path);
          return (
            <li className={issue.severity} key={`${issue.path}-${index}`}>
              {scene === null ? (
                <span className="editorial-path">{issue.path}</span>
              ) : (
                <button
                  type="button"
                  className="editorial-path"
                  onClick={() => onSelectScene(scene)}
                >
                  {issue.path}
                </button>
              )}
              <span>{issue.message}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
};
