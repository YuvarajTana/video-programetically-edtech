import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {H3, Small} from '../components/Text';
import {space, type} from '@video-kit/core/design/tokens';
import {fadeUp, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import type {FlowScene} from '@video-kit/core/spec';

const ROTATION = ['primary', 'attention', 'success', 'info'] as const;

/** Linear sequence with connectors — user journeys, request lifecycles, pipelines. */
export const Flow: React.FC<{scene: FlowScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const horizontal = layout.isLandscape;

  return (
    <Frame kicker={scene.kicker} title={scene.title} accent={scene.accent ?? 'primary'}>
      <div
        style={{
          display: 'flex',
          flexDirection: horizontal ? 'row' : 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: 0,
          width: horizontal ? layout.contentW : layout.contentW * 0.92,
        }}
      >
        {scene.steps.map((s, i) => {
          const key = s.accent ?? ROTATION[i % ROTATION.length];
          const a = accents[key];
          const at = stagger(i, 12, 6);
          return (
            <div
              key={s.label}
              style={{
                display: 'flex',
                flexDirection: horizontal ? 'row' : 'column',
                alignItems: 'center',
                flex: horizontal ? 1 : undefined,
              }}
            >
              <Card
                accent={key}
                edge="top"
                style={{
                  flex: 1,
                  width: horizontal ? '100%' : '100%',
                  textAlign: 'center',
                  padding: `${space.lg}px ${space.md}px`,
                  ...fadeUp(frame, at, 24, 32),
                }}
              >
                <div
                  style={{
                    fontFamily: font.mono,
                    fontWeight: 700,
                    fontSize: type.micro,
                    letterSpacing: 3,
                    color: a,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <H3 style={{marginTop: space.xs, fontSize: horizontal ? type.h3 : 44}}>
                  {s.label}
                </H3>
                {s.detail ? <Small style={{marginTop: space.xs}}>{s.detail}</Small> : null}
              </Card>

              {i < scene.steps.length - 1 ? (
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: 40,
                    color: color.lineHi,
                    padding: horizontal ? `0 ${space.sm}px` : `${space.xs}px 0`,
                    ...fadeUp(frame, at + 10, 18, 10),
                  }}
                >
                  {horizontal ? '→' : '↓'}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Frame>
  );
};
