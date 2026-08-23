import {Composition} from 'remotion';
import {ASPECTS, ASPECT_IDS, compositionId} from '@video-kit/core/output';
import {getChannel} from '@video-kit/core/channels';
import {STUDIO_VIDEOS} from '@video-kit/catalog';
import {Cover} from './Cover';
import {Video} from './Video';
import {totalFrames} from '@video-kit/core/spec';
import {
  calculateCoverMetadata,
  calculateVideoMetadata,
  coverDefaults,
  videoDefaults,
} from './managed';

/**
 * Two compositions per aspect, and that is the whole grid.
 *
 * Compositions used to be registered per video and per delivery, with ids that
 * every consumer parsed by splitting on "--" and counting segments. Which
 * artifact comes out is now an output variant, chosen at render time; a
 * composition only has to answer "what does this look like at this size".
 *
 * The preview-- entries exist so the catalog is browsable in Remotion Studio.
 * Nothing selects them programmatically.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {ASPECT_IDS.map((aspect) => {
      const {width, height} = ASPECTS[aspect];
      return (
        <Composition
          key={compositionId({family: 'video', aspect})}
          id={compositionId({family: 'video', aspect})}
          component={Video}
          durationInFrames={90}
          fps={30}
          width={width}
          height={height}
          defaultProps={{...videoDefaults, renderProfile: aspect}}
          calculateMetadata={calculateVideoMetadata}
        />
      );
    })}

    {ASPECT_IDS.map((aspect) => {
      const {width, height} = ASPECTS[aspect];
      return (
        <Composition
          key={compositionId({family: 'cover', aspect})}
          id={compositionId({family: 'cover', aspect})}
          component={Cover}
          durationInFrames={1}
          fps={30}
          width={width}
          height={height}
          defaultProps={{...coverDefaults, renderProfile: aspect}}
          calculateMetadata={calculateCoverMetadata}
        />
      );
    })}

    {STUDIO_VIDEOS.flatMap((spec) =>
      ASPECT_IDS.map((aspect) => {
        const {width, height} = ASPECTS[aspect];
        return (
          <Composition
            key={`preview--${spec.channel}--${spec.slug}--${aspect}`}
            id={`preview--${spec.channel}--${spec.slug}--${aspect}`}
            component={Video}
            durationInFrames={totalFrames(spec)}
            fps={spec.fps ?? 30}
            width={width}
            height={height}
            defaultProps={{
              spec,
              channel: getChannel(spec.channel),
              renderProfile: aspect,
              overlays: {},
            }}
          />
        );
      }),
    )}
  </>
);
