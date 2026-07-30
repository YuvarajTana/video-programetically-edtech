import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {fadeUp, pop, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {ColorsScene} from '../types';

export const Colors: React.FC<{scene: ColorsScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {color, font} = useTheme();
  const compact = scene.items.length > 4;
  const columns = compact ? (layout.isLandscape ? 5 : 2) : layout.isLandscape ? scene.items.length : 1;

  return (
    <Frame
      kicker={scene.kicker}
      title={scene.title}
      accent={scene.accent ?? 'primary'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: compact ? (layout.isLandscape ? space.md : space.sm) : space.xl,
          width: compact
            ? layout.isLandscape
              ? layout.contentW
              : layout.contentW * 0.92
            : layout.isLandscape
              ? layout.contentW * 0.82
              : layout.contentW * 0.86,
        }}
      >
        {scene.items.map((item, index) => {
          const at = stagger(index, compact ? 7 : 28, 7);
          return (
            <div
              key={item.name}
              style={{
                minHeight: compact ? (layout.isLandscape ? 230 : 158) : layout.isLandscape ? 470 : 430,
                padding: compact
                  ? `${space.sm}px ${space.xs}px`
                  : `${space.xl}px ${space.lg}px`,
                borderRadius: compact ? radius.lg : radius.xl,
                border: `${stroke.hair}px solid ${color.line}`,
                backgroundColor: color.surface,
                boxShadow: compact ? undefined : `0 22px 70px ${item.hex}26`,
                display: 'flex',
                flexDirection: compact && !layout.isLandscape ? 'row' : 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compact ? space.sm : space.lg,
                textAlign: 'center',
                ...fadeUp(frame, at, 24, compact ? 30 : 52),
              }}
            >
              <div
                style={{
                  width: compact ? (layout.isLandscape ? 94 : 82) : layout.isLandscape ? 210 : 190,
                  height: compact ? (layout.isLandscape ? 94 : 82) : layout.isLandscape ? 210 : 190,
                  flexShrink: 0,
                  borderRadius: '50%',
                  backgroundColor: item.hex,
                  border: `${item.hex.toUpperCase() === '#FFFFFF' ? 5 : 2}px solid ${
                    item.hex.toUpperCase() === '#FFFFFF' ? color.lineHi : `${item.hex}CC`
                  }`,
                  boxShadow: `0 14px 44px ${item.hex}3D`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: compact ? (layout.isLandscape ? 52 : 44) : 100,
                  lineHeight: 1,
                  ...pop(frame, at + 4, 24, 0.72),
                }}
              >
                {item.emoji}
              </div>

              <div>
                <div
                  style={{
                    fontFamily: font.display,
                    fontWeight: 800,
                    fontSize: compact
                      ? layout.isLandscape
                        ? type.body
                        : 32
                      : layout.isLandscape
                        ? type.h2
                        : type.h1,
                    lineHeight: 1,
                    color: color.text,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.name}
                </div>
                {!compact && item.example ? (
                  <div
                    style={{
                      marginTop: space.sm,
                      fontFamily: font.body,
                      fontWeight: 650,
                      fontSize: type.small,
                      color: color.textDim,
                    }}
                  >
                    like {item.example}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {scene.prompt ? (
        <div
          style={{
            marginTop: compact ? space.lg : space.xl,
            fontFamily: font.body,
            fontWeight: 700,
            fontSize: compact ? type.small : type.body,
            color: color.textDim,
            textAlign: 'center',
            ...fadeUp(frame, stagger(scene.items.length, compact ? 7 : 28, 15), 22, 24),
          }}
        >
          {scene.prompt}
        </div>
      ) : null}
    </Frame>
  );
};
