import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {H1, Small} from '../components/Text';
import {radius, space, tint} from '@video-kit/core/design/tokens';
import {fadeUp, pop} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import type {CalloutScene} from '@video-kit/core/spec';

export const Callout: React.FC<{scene: CalloutScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents} = useTheme();
  const key = scene.accent ?? 'attention';
  const a = accents[key];

  return (
    <Frame>
      <div
        style={{
          maxWidth: layout.isLandscape ? layout.contentW * 0.74 : layout.contentW,
          padding: `${space.xxl}px ${space.xl}px`,
          borderRadius: radius.xl,
          backgroundColor: tint(a, 'ghost'),
          border: `2px solid ${tint(a, 'mid')}`,
          textAlign: 'center',
          ...pop(frame, 0, 30, 0.94),
        }}
      >
        <div
          style={{
            width: 64,
            height: 5,
            borderRadius: 3,
            backgroundColor: a,
            margin: `0 auto ${space.lg}px`,
          }}
        />
        <H1 style={{fontSize: 72}}>{scene.text}</H1>
        {scene.attribution ? (
          <Small style={{marginTop: space.lg, ...fadeUp(frame, 22, 20, 18)}}>
            {scene.attribution}
          </Small>
        ) : null}
      </div>
    </Frame>
  );
};
