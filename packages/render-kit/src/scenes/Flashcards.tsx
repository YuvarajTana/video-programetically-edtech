import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {fadeUp, pop, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '@video-kit/core/design/tokens';
import {useTheme} from '../themes';
import type {FlashcardsScene} from '@video-kit/core/spec';

export const Flashcards: React.FC<{scene: FlashcardsScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
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
          const itemColor = item.color ?? accents[['attention', 'info', 'success', 'secondary'][index % 4] as keyof typeof accents];
          return (
            <div
              key={item.label}
              style={{
                position: 'relative',
                minHeight: compact ? (layout.isLandscape ? 230 : 158) : layout.isLandscape ? 470 : 430,
                padding: compact
                  ? `${space.sm}px ${space.xs}px`
                  : `${space.lg}px ${space.lg}px`,
                borderRadius: compact ? radius.lg : radius.xl,
                border: `${stroke.hair}px solid ${color.line}`,
                backgroundColor: compact ? color.surface : tint(itemColor, 'ghost'),
                boxShadow: compact ? undefined : `0 22px 70px ${itemColor}26`,
                display: 'flex',
                flexDirection: compact && !layout.isLandscape ? 'row' : 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compact ? space.sm : space.md,
                textAlign: 'center',
                ...fadeUp(frame, at, 24, compact ? 30 : 52),
              }}
            >
              {item.rank ? (
                <div
                  style={{
                    position: 'absolute',
                    top: compact ? space.xs : space.md,
                    left: compact ? space.xs : space.md,
                    minWidth: compact ? 48 : 66,
                    height: compact ? 48 : 66,
                    padding: `0 ${compact ? 8 : 12}px`,
                    borderRadius: radius.pill,
                    backgroundColor: itemColor,
                    color: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: font.mono,
                    fontWeight: 800,
                    fontSize: compact ? type.nano : type.micro,
                    boxShadow: `0 8px 24px ${itemColor}33`,
                  }}
                >
                  #{item.rank}
                </div>
              ) : null}

              <div
                style={{
                  width: compact ? (layout.isLandscape ? 100 : 88) : layout.isLandscape ? 250 : 220,
                  height: compact ? (layout.isLandscape ? 100 : 88) : layout.isLandscape ? 250 : 220,
                  flexShrink: 0,
                  borderRadius: compact ? radius.lg : radius.xl,
                  backgroundColor: tint(itemColor, 'soft'),
                  border: `${stroke.thin}px solid ${itemColor}99`,
                  boxShadow: `0 14px 44px ${itemColor}26`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: compact ? (layout.isLandscape ? 58 : 50) : 132,
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
                  {item.label}
                </div>
                {(!compact || scene.showCluesInCompact) && item.clue ? (
                  <div
                    style={{
                      marginTop: compact ? space.xs : space.sm,
                      fontFamily: font.body,
                      fontWeight: 650,
                      fontSize: compact ? type.nano : type.small,
                      lineHeight: compact ? 1.15 : 1.4,
                      color: color.textDim,
                    }}
                  >
                    {item.clue}
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
