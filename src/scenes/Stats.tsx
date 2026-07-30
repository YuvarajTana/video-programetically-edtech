import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {Kicker, Small} from '../components/Text';
import {accents, color, font, space, type} from '../design/tokens';
import {fadeUp, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import type {StatsScene} from '../types';

const ROTATION = ['amber', 'teal', 'coral', 'violet'] as const;

export const Stats: React.FC<{scene: StatsScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const row = layout.isLandscape || scene.cards.length <= 2;

  return (
    <Frame kicker={scene.kicker} title={scene.title} accent={scene.accent ?? 'amber'}>
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
