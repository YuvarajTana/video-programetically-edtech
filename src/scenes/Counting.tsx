import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {fadeUp, pop, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '@video-kit/core/design/tokens';
import {useTheme} from '../themes';
import type {CountingScene} from '@video-kit/core/spec';

export const Counting: React.FC<{scene: CountingScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const accent = accents[scene.accent ?? 'primary'];
  const columns = scene.number <= 4 ? scene.number : 5;
  const dotSize = 104;

  return (
    <Frame
      kicker={scene.kicker ?? `Count ${scene.number}`}
      accent={scene.accent ?? 'primary'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      <div
        style={{
          width: layout.isLandscape
            ? layout.contentW * 0.78
            : layout.contentW * 0.9,
          display: 'flex',
          flexDirection: layout.isLandscape ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: layout.isLandscape ? space.xxl : space.xl,
        }}
      >
        <div
          style={{
            width: layout.isLandscape ? 430 : 500,
            minHeight: layout.isLandscape ? 470 : 420,
            borderRadius: radius.xl,
            border: `${stroke.thick}px solid ${accent}`,
            backgroundColor: tint(accent, 'ghost'),
            boxShadow: `0 28px 80px ${accent}33`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            ...pop(frame, 2, 30, 0.72),
          }}
        >
          <div
            style={{
              fontFamily: font.display,
              fontSize: layout.isLandscape ? 260 : 280,
              fontWeight: 800,
              lineHeight: 0.82,
              color: accent,
            }}
          >
            {scene.number}
          </div>
          <div
            style={{
              marginTop: space.lg,
              fontFamily: font.display,
              fontSize: type.h1,
              fontWeight: 800,
              lineHeight: 1,
              color: color.text,
              textTransform: 'uppercase',
              ...fadeUp(frame, 12, 22, 24),
            }}
          >
            {scene.word}
          </div>
        </div>

        <div
          style={{
            width: layout.isLandscape ? 660 : 700,
            minHeight: layout.isLandscape ? 470 : 500,
            padding: `${space.xl}px ${space.lg}px`,
            borderRadius: radius.xl,
            border: `${stroke.thin}px solid ${color.lineHi}`,
            backgroundColor: color.surface,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 20px 64px ${color.line}66`,
            ...fadeUp(frame, 8, 26, 38),
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, ${dotSize}px)`,
              justifyContent: 'center',
              gap: space.md,
            }}
          >
            {Array.from({length: scene.number}, (_, index) => (
              <div
                key={index}
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: index % 3 === 2 ? radius.lg : radius.pill,
                  backgroundColor:
                    index % 2 === 0 ? accent : tint(accent, 'strong'),
                  border: `${stroke.thin}px solid ${accent}`,
                  boxShadow: `0 12px 28px ${accent}33`,
                  ...pop(frame, stagger(index, 6, 18), 22, 0.35),
                }}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: space.xl,
              fontFamily: font.mono,
              fontSize: type.small,
              fontWeight: 800,
              color: accent,
              letterSpacing: 3,
              ...fadeUp(frame, stagger(scene.number, 6, 24), 20, 18),
            }}
          >
            {scene.number} {scene.number === 1 ? 'DOT' : 'DOTS'}
          </div>
        </div>
      </div>

      {scene.prompt ? (
        <div
          style={{
            marginTop: space.xl,
            fontFamily: font.body,
            fontWeight: 750,
            fontSize: type.body,
            color: color.textDim,
            textAlign: 'center',
            ...fadeUp(frame, stagger(scene.number, 6, 30), 22, 22),
          }}
        >
          {scene.prompt}
        </div>
      ) : null}
    </Frame>
  );
};
