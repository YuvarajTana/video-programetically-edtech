import {Composition} from 'remotion';
import {FORMATS, FORMAT_IDS} from './design/formats';
import {getChannel} from './channels';
import {Cover} from './Cover';
import {DELIVERIES, deliveriesFor, renderProfilesFor} from './publishing/deliveries';
import {STUDIO_VIDEOS} from './videos/registry';
import {Video} from './Video';
import {totalFrames} from './types';

/**
 * Every video is registered once per unique render profile, plus one cover per
 * platform delivery. IDs include the channel so slugs may be reused safely.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {STUDIO_VIDEOS.flatMap((spec) => {
      const channel = getChannel(spec.channel);
      const videoCompositions = renderProfilesFor(spec, channel)
        .filter((formatId) => FORMAT_IDS.includes(formatId))
        .map((formatId) => {
          const format = FORMATS[formatId];
          return (
            <Composition
              key={`${spec.channel}--${spec.slug}--${formatId}`}
              id={`${spec.channel}--${spec.slug}--${formatId}`}
              component={Video}
              durationInFrames={totalFrames(spec)}
              fps={spec.fps ?? 30}
              width={format.width}
              height={format.height}
              defaultProps={{spec, channel, renderProfile: formatId}}
            />
          );
        });

      const coverCompositions =
        spec.kind === 'style-guide'
          ? []
          : deliveriesFor(spec, channel).map((deliveryId) => {
              const delivery = DELIVERIES[deliveryId];
              const format = FORMATS[delivery.renderProfile];
              return (
                <Composition
                  key={`${spec.channel}--${spec.slug}--${deliveryId}--cover`}
                  id={`${spec.channel}--${spec.slug}--${deliveryId}--cover`}
                  component={Cover}
                  durationInFrames={1}
                  fps={spec.fps ?? 30}
                  width={format.width}
                  height={format.height}
                  defaultProps={{spec, channel, delivery}}
                />
              );
            });

      return [...videoCompositions, ...coverCompositions];
    })}
  </>
);
