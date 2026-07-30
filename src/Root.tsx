import {Composition} from 'remotion';
import {FORMATS, FORMAT_IDS} from './design/formats';
import type {FormatId} from './design/formats';
import {VIDEOS} from './videos/registry';
import {Video} from './Video';
import {totalFrames} from './types';

/**
 * Every video is registered once per delivery format. Composition ids read
 * `<slug>--<format>`, which is what the render script and the Studio sidebar
 * both key off.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {VIDEOS.flatMap((spec) => {
      const formats = (spec.formats ?? ['youtube', 'reel']) as FormatId[];
      return formats
        .filter((f) => FORMAT_IDS.includes(f))
        .map((formatId) => {
          const format = FORMATS[formatId];
          return (
            <Composition
              key={`${spec.slug}--${formatId}`}
              id={`${spec.slug}--${formatId}`}
              component={Video}
              durationInFrames={totalFrames(spec)}
              fps={spec.fps ?? 30}
              width={format.width}
              height={format.height}
              defaultProps={{spec}}
            />
          );
        });
    })}
  </>
);
