import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {Body, H3, Small} from '../components/Text';
import {space, type} from '../design/tokens';
import {fadeIn, slideIn, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import type {StepsScene} from '../types';

const ROTATION = ['attention', 'primary', 'success', 'info'] as const;

export const Steps: React.FC<{scene: StepsScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  return (
    <Frame kicker={scene.kicker} accent={scene.accent ?? 'primary'} align="center">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
          width: layout.isLandscape ? layout.contentW * 0.72 : layout.contentW,
        }}
      >
        {scene.items.map((item, i) => {
          const a = accents[item.accent ?? ROTATION[i % ROTATION.length]];
          return (
            <Card
              key={item.label}
              edge="left"
              accent={item.accent ?? ROTATION[i % ROTATION.length]}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: space.xl,
                ...slideIn(frame, stagger(i, 11, 8), 26, 56),
              }}
            >
              <span
                style={{
                  fontFamily: font.mono,
                  fontWeight: 700,
                  fontSize: type.h3,
                  color: a,
                  minWidth: 72,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <H3>{item.label}</H3>
                {item.detail ? (
                  <Small style={{marginTop: space.xs}}>{item.detail}</Small>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {scene.footnote ? (
        <Body
          style={{
            marginTop: space.xl,
            color: color.muted,
            ...fadeIn(frame, stagger(scene.items.length, 11, 20)),
          }}
        >
          {scene.footnote}
        </Body>
      ) : null}
    </Frame>
  );
};
