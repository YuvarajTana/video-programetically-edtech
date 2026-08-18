import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {Kicker, Small} from '../components/Text';
import {space, type} from '@video-kit/core/design/tokens';
import {fadeUp, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import type {StatsScene} from '@video-kit/core/spec';

const ROTATION = ['primary', 'success', 'attention', 'info'] as const;

export const Stats: React.FC<{scene: StatsScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const row = layout.isLandscape || scene.cards.length <= 2;

  return (
    <Frame kicker={scene.kicker} title={scene.title} accent={scene.accent ?? 'primary'}>
      <div
        style={{
          display: 'flex',
          flexDirection: row && layout.isLandscape ? 'row' : 'column',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: space.md,
          width: layout.isLandscape ? layout.contentW * 0.9 : layout.contentW,
        }}
      >
        {scene.cards.map((c, i) => {
          const key = c.accent ?? ROTATION[i % ROTATION.length];
          return (
            <Card
              key={c.label}
              edge="top"
              accent={key}
              glow
              style={{
                flex: layout.isLandscape ? 1 : undefined,
                minWidth: layout.isLandscape ? 320 : undefined,
                ...fadeUp(frame, stagger(i, 10, 6), 26, 40),
              }}
            >
              <Kicker accent={accents[key]}>{c.label}</Kicker>
              <div
                style={{
                  fontFamily: font.mono,
                  fontWeight: 700,
                  fontSize: type.h2,
                  color: color.text,
                  margin: `${space.sm}px 0 ${space.xs}px`,
                }}
              >
                {c.value}
              </div>
              {c.note ? <Small>{c.note}</Small> : null}
            </Card>
          );
        })}
      </div>
    </Frame>
  );
};
