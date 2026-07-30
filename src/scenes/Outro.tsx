import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {Body, H1, Small} from '../components/Text';
import {accents, color, font, space, type} from '../design/tokens';
import {fadeUp, pop} from '../design/anim';
import {useLayout} from '../design/formats';
import type {OutroScene} from '../types';

export const Outro: React.FC<{scene: OutroScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const a = accents[scene.accent ?? 'amber'];

  return (
    <Frame>
      <div
        style={{
          textAlign: 'center',
          width: layout.isLandscape ? layout.contentW * 0.7 : layout.contentW,
        }}
      >
        {scene.recap?.length ? (
          <Card style={{textAlign: 'left', marginBottom: space.xl, ...fadeUp(frame, 0, 24, 34)}}>
            {scene.recap.map((line, i) => (
              <div
                key={line}
                style={{
                  fontFamily: font.mono,
                  fontSize: type.small,
                  lineHeight: 1.7,
                  color: i === 0 ? color.muted : color.text,
                  ...fadeUp(frame, 6 + i * 6, 18, 12),
                }}
              >
                {line}
              </div>
            ))}
          </Card>
        ) : null}

        {scene.handle ? (
          <div style={pop(frame, 18, 28, 0.9)}>
            <H1 style={{color: a, fontSize: type.h1}}>{scene.handle}</H1>
          </div>
        ) : null}
        {scene.tagline ? (
          <Body style={{marginTop: space.sm, ...fadeUp(frame, 26, 22, 20)}}>
            {scene.tagline}
          </Body>
        ) : null}
        {scene.cta ? (
          <Small
            style={{
              marginTop: space.xl,
              color: a,
              fontFamily: font.mono,
              letterSpacing: 3,
              textTransform: 'uppercase',
              ...fadeUp(frame, 34, 22, 18),
            }}
          >
            {scene.cta}
          </Small>
        ) : null}
      </div>
    </Frame>
  );
};
