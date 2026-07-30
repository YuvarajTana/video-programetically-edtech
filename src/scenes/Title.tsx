import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {Body, Display, Kicker} from '../components/Text';
import {accents, color, space} from '../design/tokens';
import {drawWidth, fadeUp, pop, sceneFade} from '../design/anim';
import {useLayout} from '../design/formats';
import type {TitleScene} from '../types';

export const Title: React.FC<{scene: TitleScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const a = accents[scene.accent ?? 'amber'];

  return (
    <Frame noFade>
      <div
        style={{
          textAlign: 'center',
          maxWidth: layout.isLandscape ? layout.contentW * 0.78 : layout.contentW,
          opacity: sceneFade(frame, durationInFrames, 8),
        }}
      >
        {scene.kicker ? (
          <div style={fadeUp(frame, 0, 20, 26)}>
            <Kicker accent={a}>{scene.kicker}</Kicker>
          </div>
        ) : null}

        <div style={{marginTop: space.lg, ...pop(frame, 5, 34, 0.92)}}>
          <Display>{scene.title}</Display>
        </div>

        <div
          style={{
            height: 5,
            borderRadius: 3,
            backgroundColor: a,
            margin: `${space.xl}px auto`,
            width: drawWidth(frame, 22, 240, 24),
          }}
        />

        {scene.subtitle ? (
          <div style={fadeUp(frame, 30, 24, 30)}>
            <Body style={{color: color.muted, fontSize: 46}}>{scene.subtitle}</Body>
          </div>
        ) : null}
      </div>
    </Frame>
  );
};
