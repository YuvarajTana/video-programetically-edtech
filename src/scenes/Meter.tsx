import {interpolate, useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {EASE_IO, fadeUp} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {MeterScene} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * One quantity filling toward a limit — capacity, budget, a context window.
 * Distinct from `chart` (which compares categories): the meter's story is a
 * single number moving, with the ceiling visible the whole time.
 */
export const Meter: React.FC<{scene: MeterScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const accent = accents[scene.accent ?? 'primary'];

  const from = scene.from ?? 0;
  const fillStart = 18;
  const fillEnd = fillStart + 45;
  const value = interpolate(frame, [fillStart, fillEnd], [from, scene.to], {
    ...clamp,
    easing: EASE_IO,
  });
  const pct = Math.max(0, Math.min(1, value / scene.max));
  const barW = layout.isLandscape ? layout.contentW * 0.72 : layout.contentW * 0.92;
  const barH = layout.isLandscape ? 64 : 58;
  const markerPct = scene.marker ? Math.min(1, scene.marker.value / scene.max) : null;
  const nearLimit = markerPct !== null && pct >= markerPct * 0.98;
  const format = (n: number) =>
    `${Math.round(n).toLocaleString('en-US')}${scene.unit ?? ''}`;

  return (
    <Frame
      kicker={scene.kicker}
      title={scene.title}
      accent={scene.accent ?? 'primary'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      {scene.label ? (
        <div
          style={{
            marginBottom: space.md,
            fontFamily: font.body,
            fontWeight: 700,
            fontSize: layout.isLandscape ? type.body : type.small,
            color: color.textDim,
            ...fadeUp(frame, 4, 16, 14),
          }}
        >
          {scene.label}
        </div>
      ) : null}

      <div
        style={{
          fontFamily: font.mono,
          fontWeight: 800,
          fontSize: layout.isLandscape ? type.h1 : type.h2,
          lineHeight: 1,
          color: nearLimit ? accents.attention : color.text,
          marginBottom: space.lg,
          ...fadeUp(frame, 8, 16, 16),
        }}
      >
        {format(value)}
        <span style={{fontSize: type.body, color: color.textDim, fontWeight: 700}}>
          {' '}
          / {format(scene.max)}
        </span>
      </div>

      <div style={{position: 'relative', width: barW, ...fadeUp(frame, 12, 18, 20)}}>
        <div
          style={{
            width: '100%',
            height: barH,
            borderRadius: radius.pill,
            border: `${stroke.hair}px solid ${color.line}`,
            backgroundColor: color.surface,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct * 100}%`,
              height: '100%',
              borderRadius: radius.pill,
              backgroundColor: nearLimit ? accents.attention : accent,
              boxShadow: `0 0 40px ${(nearLimit ? accents.attention : accent)}44`,
            }}
          />
        </div>

        {markerPct !== null ? (
          <>
            <div
              style={{
                position: 'absolute',
                top: -10,
                bottom: -10,
                left: `${markerPct * 100}%`,
                width: stroke.thin,
                backgroundColor: accents.attention,
                borderRadius: radius.pill,
              }}
            />
            {scene.marker?.label ? (
              <div
                style={{
                  position: 'absolute',
                  top: -46,
                  left: `${markerPct * 100}%`,
                  transform: 'translateX(-50%)',
                  padding: `2px ${space.sm}px`,
                  borderRadius: radius.pill,
                  backgroundColor: tint(accents.attention, 'faint'),
                  fontFamily: font.mono,
                  fontWeight: 800,
                  fontSize: type.nano,
                  letterSpacing: 1,
                  whiteSpace: 'nowrap',
                  color: accents.attention,
                }}
              >
                {scene.marker.label}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {scene.note ? (
        <div
          style={{
            marginTop: space.xl,
            maxWidth: barW,
            fontFamily: font.body,
            fontWeight: 650,
            fontSize: layout.isLandscape ? type.body : type.small,
            lineHeight: 1.4,
            color: color.textDim,
            textAlign: 'center',
            ...fadeUp(frame, fillEnd, 18, 18),
          }}
        >
          {scene.note}
        </div>
      ) : null}
    </Frame>
  );
};
